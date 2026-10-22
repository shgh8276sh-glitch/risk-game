const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 180000,
  pingInterval: 25000,
});

const rooms = {};
const ADMIN_SECRET = 'shahab123';

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on('connection', (socket) => {
  console.log('کاربر متصل شد:', socket.id);

  socket.on('create_room', ({ username, playerId, maxPlayers, adminSecret }, callback) => {
    if (adminSecret !== ADMIN_SECRET) {
      return callback({ success: false, message: 'رمز عبور ادمین اشتباه است!' });
    }

    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      hostPlayerId: playerId,
      maxPlayers: maxPlayers || 5,
      players: [{ socketId: socket.id, playerId, name: username, color: '#dc2626', isHost: true }],
      gameState: null,
    };

    socket.join(roomCode);
    callback({ success: true, roomCode, players: rooms[roomCode].players });
  });

  socket.on('join_room', ({ username, playerId, roomCode }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      return callback({ success: false, message: 'روم مورد نظر یافت نشد!' });
    }

    socket.join(roomCode);

    let existingPlayer = room.players.find(p => p.playerId === playerId || p.name === username);

    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      existingPlayer.playerId = playerId;
      if (room.hostPlayerId === playerId) {
        existingPlayer.isHost = true;
      }
    } else {
      if (room.players.length >= room.maxPlayers) {
        return callback({ success: false, message: 'ظرفیت روم تکمیل است!' });
      }

      const colors = ['#dc2626', '#2563eb', '#16a34a', '#eab308', '#9333ea'];
      const isHost = room.players.length === 0;
      
      const newPlayer = {
        socketId: socket.id,
        playerId,
        name: username,
        color: colors[room.players.length % colors.length],
        isHost,
      };

      if (isHost) room.hostPlayerId = playerId;
      room.players.push(newPlayer);
    }

    callback({ success: true, roomCode, players: room.players, gameState: room.gameState });
    
    // ارسال زنده و همگانی لیست جدید بازیکنان به تمام اعضای روم (حل مشکل عدم نمایش افراد اضافه شده)
    io.in(roomCode).emit('room_updated', { players: room.players });
  });

  socket.on('request_room_players', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (room) {
      io.in(roomCode).emit('room_updated', { players: room.players });
    }
  });

  socket.on('start_game', ({ roomCode, initialState }) => {
    const room = rooms[roomCode];
    if (room) {
      room.gameState = initialState;
      io.in(roomCode).emit('game_started', initialState);
      console.log(`بازی در روم ${roomCode} شروع شد.`);
    }
  });

  socket.on('update_game_state', ({ roomCode, newState }) => {
    const room = rooms[roomCode];
    if (room) {
      room.gameState = newState;
      socket.to(roomCode).emit('game_state_updated', newState);
    }
  });

  socket.on('disconnect', () => {
    console.log('قطع اتصال:', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} روشن شد.`);
});
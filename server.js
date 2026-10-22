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
    if (!room) return callback({ success: false, message: 'روم مورد نظر یافت نشد!' });

    socket.join(roomCode);
    let existingPlayer = room.players.find(p => p.playerId === playerId || p.name === username);

    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      existingPlayer.playerId = playerId;
      if (room.hostPlayerId === playerId) existingPlayer.isHost = true;
    } else {
      if (room.players.length >= room.maxPlayers) return callback({ success: false, message: 'ظرفیت تکمیل است!' });
      const colors = ['#dc2626', '#2563eb', '#16a34a', '#eab308', '#9333ea'];
      const isHost = room.players.length === 0;
      room.players.push({
        socketId: socket.id,
        playerId,
        name: username,
        color: colors[room.players.length % colors.length],
        isHost,
      });
      if (isHost) room.hostPlayerId = playerId;
    }

    callback({ success: true, roomCode, players: room.players, gameState: room.gameState });
    io.in(roomCode).emit('room_updated', { players: room.players });
  });

  socket.on('start_game', ({ roomCode, initialState }) => {
    const room = rooms[roomCode];
    if (room) {
      room.gameState = initialState;
      io.in(roomCode).emit('game_started', initialState);
    }
  });

  // قفل امنیتی سرور: بررسی اینکه فرستنده درخواست حتماً بازیکنِ نوبت جاری باشد
  socket.on('update_game_state', ({ roomCode, newState, senderUsername }) => {
    const room = rooms[roomCode];
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];

    // اگر کسی که درخواست تغییر داده، بازیکن نوبت فعلی نباشد، سرور آن را بلافاصله مسدود می‌کند
    if (!activePlayer || activePlayer.name !== senderUsername) {
      console.log(`تلاش غیرمجاز توسط ${senderUsername} در نوبت ${activePlayer?.name} مسدود شد.`);
      return;
    }

    room.gameState = newState;
    // ارسال دقیق وضعیت جدید به تمام بازیکنان حاضر در روم تا نقشه برای همه یکسان آپدیت شود
    io.in(roomCode).emit('game_state_updated', newState);
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`سرور امنیتی روی پورت ${PORT} روشن شد.`);
});
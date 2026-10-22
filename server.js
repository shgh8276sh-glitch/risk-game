const express = require('express');
const http = http = require('http'); // یا const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ذخیره روم‌های فعال
const rooms = {};

// رمز عبور ادمین برای ساخت روم
const ADMIN_SECRET = 'shahab123';

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // تولید کد ۶ رقمی
}

io.on('connection', (socket) => {
  console.log('کاربر متصل شد:', socket.id);

  // ۱. ساخت روم (فقط توسط ادمین با رمز عبور صحیح)
  socket.on('create_room', ({ username, maxPlayers, adminSecret }, callback) => {
    console.log('درخواست ساخت روم از طرف:', username);

    if (adminSecret !== ADMIN_SECRET) {
      return callback({ success: false, message: 'رمز عبور ادمین اشتباه است! (رمز صحیح: shahab123)' });
    }

    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      hostId: socket.id,
      maxPlayers: maxPlayers || 5,
      players: [{ id: socket.id, name: username, color: '#dc2626', isHost: true }],
      gameState: null,
    };

    socket.join(roomCode);
    console.log(`روم با موفقیت ساخته شد: ${roomCode}`);
    callback({ success: true, roomCode, players: rooms[roomCode].players });
  });

  // ۲. پیوستن بازیکنان به روم با کد ۶ رقمی
  socket.on('join_room', ({ username, roomCode }, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      return callback({ success: false, message: 'روم مورد نظر یافت نشد!' });
    }
    if (room.players.length >= room.maxPlayers) {
      return callback({ success: false, message: 'ظرفیت روم تکمیل است!' });
    }

    const colors = ['#dc2626', '#2563eb', '#16a34a', '#eab308', '#9333ea'];
    const newPlayer = {
      id: socket.id,
      name: username,
      color: colors[room.players.length % colors.length],
      isHost: false,
    };

    room.players.push(newPlayer);
    socket.join(roomCode);

    callback({ success: true, roomCode, players: room.players, isHost: false });
    
    // اطلاع‌رسانی به سایر اعضای روم
    io.to(roomCode).emit('room_updated', { players: room.players });
  });

  // ۳. شروع بازی توسط سازنده روم (Host)
  socket.on('start_game', ({ roomCode, initialState }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.gameState = initialState;
      io.to(roomCode).emit('game_started', initialState);
      console.log(`بازی در روم ${roomCode} شروع شد.`);
    }
  });

  // ۴. همگام‌سازی وضعیت بازی بین بازیکنان
  socket.on('update_game_state', ({ roomCode, newState }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].gameState = newState;
      socket.to(roomCode).emit('game_state_updated', newState);
    }
  });

  // ۵. قطع اتصال کاربر
  socket.on('disconnect', () => {
    console.log('کاربر قطع شد:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`سرور بازی آنلاین روی پورت ${PORT} روشن شد.`);
});
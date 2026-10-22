const express = require('express');
const http = require('http');
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
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ذخیره روم‌های فعال
const rooms = {};
const ADMIN_SECRET = 'shahab123';

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on('connection', (socket) => {
  console.log('کاربر متصل شد:', socket.id);

  // ۱. ساخت روم جدید
  socket.on('create_room', ({ username, maxPlayers, adminSecret }, callback) => {
    if (adminSecret !== ADMIN_SECRET) {
      return callback({ success: false, message: 'رمز عبور ادمین اشتباه است!' });
    }

    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      hostId: socket.id,
      maxPlayers: maxPlayers || 5,
      players: [{ id: socket.id, name: username, color: '#dc2626', isHost: true }],
      gameState: null,
    };

    socket.join(roomCode);
    console.log(`روم ساخته شد: ${roomCode} توسط ${username}`);
    callback({ success: true, roomCode, players: rooms[roomCode].players });
  });

  // ۲. پیوستن بازیکن جدید به روم (و مدیریت رفرش صفحه)
  socket.on('join_room', ({ username, roomCode }, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      return callback({ success: false, message: 'روم مورد نظر یافت نشد!' });
    }

    socket.join(roomCode);

    // بررسی اینکه آیا بازیکن قبلاً با این نام در روم بوده یا نه (برای هندل کردن رفرش)
    let existingPlayer = room.players.find(p => p.name === username);
    
    if (existingPlayer) {
      // آپدیت کردن اسلات سوکت ایدی جدید بعد از رفرش
      existingPlayer.id = socket.id;
    } else {
      if (room.players.length >= room.maxPlayers && room.gameState) {
        return callback({ success: false, message: 'بازی شروع شده و ظرفیت تکمیل است!' });
      }

      const colors = ['#dc2626', '#2563eb', '#16a34a', '#eab308', '#9333ea'];
      const newPlayer = {
        id: socket.id,
        name: username,
        color: colors[room.players.length % colors.length],
        isHost: room.players.length === 0,
      };
      room.players.push(newPlayer);
    }

    callback({ success: true, roomCode, players: room.players, gameState: room.gameState });
    
    // ارسال آپدیت به تمام اعضای روم
    io.to(roomCode).emit('room_updated', { players: room.players });
  });

  // ۳. شروع بازی توسط میزبان
  socket.on('start_game', ({ roomCode, initialState }) => {
    const room = rooms[roomCode];
    if (room) {
      room.gameState = initialState;
      io.to(roomCode).emit('game_started', initialState);
      console.log(`بازی در روم ${roomCode} شروع شد.`);
    }
  });

  // ۴. همگام‌سازی وضعیت بازی و اکشن‌ها
  socket.on('update_game_state', ({ roomCode, newState }) => {
    const room = rooms[roomCode];
    if (room) {
      room.gameState = newState;
      socket.to(roomCode).emit('game_state_updated', newState);
    }
  });

  socket.on('disconnect', () => {
    console.log('کاربر قطع شد:', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`سرور پیشرفته بازی روی پورت ${PORT} روشن شد.`);
});
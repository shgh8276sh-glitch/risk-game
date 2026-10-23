const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 20000,
});

const rooms = {};
const ADMIN_SECRET = 'shahab123';

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function resolveCombat(attackerArmies, defenderArmies) {
  const attackerDiceCount = Math.min(attackerArmies - 1, 3);
  const defenderDiceCount = Math.min(defenderArmies, 2);
  const attackerRolls = Array.from({ length: attackerDiceCount }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
  const defenderRolls = Array.from({ length: defenderDiceCount }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
  let attackerLosses = 0;
  let defenderLosses = 0;
  for (let i = 0; i < Math.min(attackerRolls.length, defenderRolls.length); i++) {
    if (attackerRolls[i] > defenderRolls[i]) {
      defenderLosses++;
    } else {
      attackerLosses++;
    }
  }
  return { attackerRolls, defenderRolls, attackerLosses, defenderLosses };
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
      attackerReady: false,
      defenderReady: false,
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
      const isHost = room.players.length === 0 || room.hostPlayerId === playerId;
      room.players.push({
        socketId: socket.id,
        playerId,
        name: username,
        color: colors[room.players.length % colors.length],
        isHost,
      });
      if (isHost) room.hostPlayerId = playerId;
    }
    callback({
      success: true,
      roomCode,
      players: room.players,
      gameState: room.gameState,
      attackerReady: room.attackerReady,
      defenderReady: room.defenderReady,
    });
    io.in(roomCode).emit('room_updated', { players: room.players });
  });

  socket.on('request_room_players', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (room) {
      socket.emit('room_updated', { players: room.players });
    }
  });

  socket.on('start_game', ({ roomCode, initialState }) => {
    const room = rooms[roomCode];
    if (room) {
      room.gameState = initialState;
      room.attackerReady = false;
      room.defenderReady = false;
      io.in(roomCode).emit('game_started', initialState);
      io.in(roomCode).emit('dice_ready_updated', { attackerReady: false, defenderReady: false });
    }
  });

  // ====================== فقط این بخش اصلاح شده ======================
  socket.on('set_dice_status', (payload) => {
    const { roomCode } = payload;
    const room = rooms[roomCode];
    if (!room || !room.gameState) return;

    // فقط فلگ مربوط به فرستنده را قبول کن (جلوگیری از race)
    if (payload.from === 'attacker') {
      room.attackerReady = !!payload.attackerReady;
    } else if (payload.from === 'defender') {
      room.defenderReady = !!payload.defenderReady;
    } else {
      // حالت reset کامل (لغو حمله، انتخاب مجدد، مرحله بعد)
      room.attackerReady = !!payload.attackerReady;
      room.defenderReady = !!payload.defenderReady;
    }

    // اگر هر دو آماده شدند → فوراً نبرد را حل کن
    if (room.attackerReady && room.defenderReady) {
      const state = room.gameState;

      if (state.selectedTerritoryId && state.attackTargetId) {
        const attacker = state.territories[state.selectedTerritoryId];
        const defender = state.territories[state.attackTargetId];

        if (attacker && defender) {
          const combat = resolveCombat(attacker.armies, defender.armies);
          const newAttackerArmies = attacker.armies - combat.attackerLosses;
          const newDefenderArmies = defender.armies - combat.defenderLosses;

          const newTerritories = { ...state.territories };

          if (newDefenderArmies <= 0) {
            // منطقه فتح شد
            newTerritories[state.selectedTerritoryId] = {
              ...attacker,
              armies: Math.max(1, newAttackerArmies - 1),
            };
            newTerritories[state.attackTargetId] = {
              id: defender.id,
              ownerId: attacker.ownerId,
              armies: 1,
            };
          } else {
            newTerritories[state.selectedTerritoryId] = {
              ...attacker,
              armies: newAttackerArmies,
            };
            newTerritories[state.attackTargetId] = {
              ...defender,
              armies: newDefenderArmies,
            };
          }

          state.territories = newTerritories;
          state.selectedTerritoryId = null;
          state.attackTargetId = null;
          state.diceResult = {
            attacker: combat.attackerRolls,
            defender: combat.defenderRolls,
            message: newDefenderArmies <= 0
              ? '🎉 منطقه فتح شد!'
              : `تلفات مهاجم: ${combat.attackerLosses} | مدافع: ${combat.defenderLosses}`,
          };
        }
      }

      // بعد از نبرد همیشه فلگ‌ها را صفر کن
      room.attackerReady = false;
      room.defenderReady = false;

      io.in(roomCode).emit('dice_ready_updated', {
        attackerReady: false,
        defenderReady: false,
      });
      io.in(roomCode).emit('game_state_updated', state);
    } else {
      // فقط وضعیت آماده بودن را به همه بفرست
      io.in(roomCode).emit('dice_ready_updated', {
        attackerReady: room.attackerReady,
        defenderReady: room.defenderReady,
      });
    }
  });
  // ==================================================================

  // این بخش را دست نزن
  socket.on('update_game_state', ({ roomCode, newState }) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.gameState = newState;
    if (!newState.attackTargetId || !newState.selectedTerritoryId) {
      room.attackerReady = false;
      room.defenderReady = false;
      io.in(roomCode).emit('dice_ready_updated', { attackerReady: false, defenderReady: false });
    }
    io.in(roomCode).emit('game_state_updated', newState);
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} فعال است.`);
});
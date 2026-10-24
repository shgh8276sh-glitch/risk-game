const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const rooms = {};

// برای امنیت بهتر، رمز را در Render از بخش Environment با نام ADMIN_SECRET تنظیم کن
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'shahab123';

const AFK_SKIP_MS = 45 * 1000; // اگر بازیکنِ نوبت‌دار این‌قدر آفلاین بماند، نوبتش رد می‌شود
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // روم بدون بازیکنِ آنلاین بعد از ۶ ساعت پاک می‌شود
const MAX_LOG = 40;
const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#eab308', '#9333ea'];

// ───────────── داده‌های نقشه (هم‌خوان با territories.ts) ─────────────
const CONTINENT_TERRITORIES = {
  na: ['alaska', 'northwest_territory', 'greenland', 'alberta', 'ontario', 'quebec', 'western_us', 'eastern_us', 'central_america'],
  sa: ['venezuela', 'peru', 'brazil', 'argentina'],
  eu: ['iceland', 'scandinavia', 'great_britain', 'northern_europe', 'western_europe', 'southern_europe', 'ukraine'],
  af: ['north_africa', 'egypt', 'east_africa', 'congo', 'south_africa', 'madagascar'],
  as: ['ural', 'siberian', 'yakutsk', 'kamchatka', 'irkutsk', 'mongolia', 'japan', 'afghanistan', 'china', 'india', 'siam', 'middle_east'],
  au: ['indonesia', 'new_guinea', 'western_australia', 'eastern_australia'],
};
const CONTINENT_BONUS = { na: 5, sa: 2, eu: 5, af: 3, as: 7, au: 2 };
// اگر نمی‌خواهی پاداش قاره‌ها در شروع نوبت محاسبه شود، false کن
const CONTINENT_BONUS_ENABLED = true;

// نام فارسی قاره‌ها در متن ماموریت‌ها
const CONTINENT_NAME_TO_ID = {
  'آمریکای شمالی': 'na',
  'آمریکای جنوبی': 'sa',
  'اروپا': 'eu',
  'آفریقا': 'af',
  'آسیا': 'as',
  'استرالیا': 'au',
};
// رنگ ارتش‌ها در متن ماموریت‌ها (نارنجی در بازی وجود ندارد)
const COLOR_BY_WORD = {
  'قرمز': '#dc2626',
  'آبی': '#2563eb',
  'سبز': '#16a34a',
  'زرد': '#eab308',
  'بنفش': '#9333ea',
};

// ───────────── قوانین کارت (طبق راهنمای بازی) ─────────────
// روش ۱: ۳ کارت هم‌نماد یا ۳ نماد متفاوت | روش ۲: مجموع ستاره‌ها
const SYMBOL_BONUS = { infantry: 4, cavalry: 6, artillery: 8, different: 10 };
const STAR_BONUS = { 2: 2, 3: 4, 4: 7, 5: 10, 6: 13 };
const MIN_CARDS_FOR_STARS = 2; // حداقل تعداد کارت برای مبادله‌ی ستاره‌ای
const CARD_TYPES = ['infantry', 'cavalry', 'artillery'];

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send('Risk server is running'));
// برای سرویس‌های مانیتورینگ (مثلاً UptimeRobot) تا سرور رایگان Render خواب نرود
app.get('/health', (req, res) => {
  res.json({ ok: true, rooms: Object.keys(rooms).length, uptime: Math.round(process.uptime()) });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 20000,
});

// ───────────── توابع کمکی عمومی ─────────────

const clone = (obj) => JSON.parse(JSON.stringify(obj));
const safeCallback = (cb) => (typeof cb === 'function' ? cb : () => {});
const cleanName = (n) => String(n || '').trim().slice(0, 20);
const prettyName = (id) => String(id).replace(/[-_]/g, ' ');
const touch = (room) => { room.lastActivity = Date.now(); };

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms[code]);
  return code;
}

// ───────────── وضعیت بازیکنان روم ─────────────
// هر بازیکن: { playerId, name, color, isHost, left, sockets:Set }
// status: online (حداقل یک سوکت زنده) | offline (قطع اتصال، می‌تواند برگردد) | left (خودش خارج شده)

const statusOf = (p) => (p.left ? 'left' : p.sockets.size > 0 ? 'online' : 'offline');

// playerId هرگز برای دیگران ارسال نمی‌شود (جلوگیری از جعل هویت)
const publicPlayers = (room) =>
  room.players.map((p) => ({ name: p.name, color: p.color, isHost: p.isHost, status: statusOf(p) }));

const broadcastPlayers = (roomCode, room) => {
  io.in(roomCode).emit('room_updated', { players: publicPlayers(room) });
};

const playerOf = (room, socket) => room.players.find((p) => p.playerId === socket.playerId);

const refreshHostFlags = (room) => {
  room.players.forEach((p) => { p.isHost = p.playerId === room.hostPlayerId; });
};

function transferHost(room) {
  const candidates = room.players.filter((p) => !p.left && p.playerId !== room.hostPlayerId);
  const next = candidates.find((p) => statusOf(p) === 'online') || candidates[0];
  if (next) room.hostPlayerId = next.playerId;
}

function pickColor(room) {
  const used = new Set(room.players.map((p) => p.color));
  return COLORS.find((c) => !used.has(c)) || COLORS[room.players.length % COLORS.length];
}

// آیا سوکت فرستنده همان بازیکنِ نوبت‌دار است؟ (هویت از روی playerId ثبت‌شده در سوکت)
function isActivePlayerSocket(room, socket, roomCode) {
  const state = room && room.gameState;
  if (!state || socket.roomCode !== roomCode) return false;
  const rp = playerOf(room, socket);
  const active = state.players && state.players[state.activePlayerIndex];
  return !!(rp && !rp.left && active && rp.name === active.name);
}

// ───────────── توابع کمکی state بازی ─────────────

function addLog(state, text) {
  if (!state) return;
  state.log = [...(state.log || []), { t: Date.now(), text }].slice(-MAX_LOG);
}

const countTerritories = (state, ownerId) =>
  Object.values(state.territories).filter((t) => t.ownerId === ownerId).length;

function continentBonusFor(state, playerId) {
  if (!CONTINENT_BONUS_ENABLED) return 0;
  let total = 0;
  for (const cid of Object.keys(CONTINENT_TERRITORIES)) {
    const all = CONTINENT_TERRITORIES[cid].every((tid) => state.territories[tid] && state.territories[tid].ownerId === playerId);
    if (all) total += CONTINENT_BONUS[cid];
  }
  return total;
}

// سرباز شروع نوبت = max(3, قلمروها ÷ ۳) + پاداش قاره‌های کامل
const reinforcementsFor = (state, playerId) =>
  Math.max(3, Math.floor(countTerritories(state, playerId) / 3)) + continentBonusFor(state, playerId);

function clearSelections(state) {
  state.selectedTerritoryId = null;
  state.attackTargetId = null;
  state.fortifySourceId = null;
  state.reinforcementHistory = [];
}

// ───────────── کارت‌ها ─────────────

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// یک کارت برای هر قلمرو؛ نماد (پیاده/سواره/توپخانه) و ستاره (۱ یا ۲) به‌صورت متوازن پخش می‌شود
function buildDeck(territoryIds) {
  const deck = territoryIds.map((id, i) => ({
    id: `card_${id}`,
    territoryId: id,
    type: CARD_TYPES[i % 3],
    stars: (Math.floor(i / 3) % 2) + 1,
  }));
  return shuffle(deck);
}

function drawCard(room) {
  if (room.deck.length === 0 && room.discard.length > 0) {
    room.deck = shuffle(room.discard);
    room.discard = [];
  }
  return room.deck.pop() || null;
}

// اگر در این نوبت حداقل یک فتح موفق بوده، دقیقاً یک کارت به بازیکن نوبت‌دار می‌رسد
function awardCardIfEarned(room) {
  const state = room.gameState;
  if (!state.conqueredTerritoryThisTurn) return;
  state.conqueredTerritoryThisTurn = false;
  const player = state.players[state.activePlayerIndex];
  const card = drawCard(room);
  if (!card) {
    addLog(state, '🃏 دسته‌ی کارت‌ها خالی است و کارتی داده نشد');
    return;
  }
  player.cards = [...(player.cards || []), card];
  addLog(state, `🃏 ${player.name} به‌خاطر فتح در این نوبت یک کارت گرفت`);
}

// ارزیابی یک مجموعه کارت؛ اگر هر دو روش ممکن باشد، پاداش بیشتر
function evaluateCardSet(cards) {
  let best = null;
  const consider = (bonus, method) => {
    if (!best || bonus > best.bonus) best = { valid: true, bonus, method };
  };

  if (cards.length === 3) {
    const types = cards.map((c) => c.type);
    if (types.every((t) => t === types[0]) && SYMBOL_BONUS[types[0]]) {
      consider(SYMBOL_BONUS[types[0]], 'symbols');
    } else if (CARD_TYPES.every((t) => types.includes(t))) {
      consider(SYMBOL_BONUS.different, 'symbols');
    }
  }

  if (cards.length >= MIN_CARDS_FOR_STARS && cards.length <= 3) {
    const stars = cards.reduce((sum, c) => sum + (c.stars || 1), 0);
    if (STAR_BONUS[stars]) consider(STAR_BONUS[stars], 'stars');
  }

  return best || { valid: false, bonus: 0, method: null };
}

// ───────────── ماموریت‌ها و پیروزی ─────────────

const normalizeText = (str) =>
  String(str || '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');

// متن فارسی ماموریت را به یک شرط قابل‌اجرا تبدیل می‌کند
function parseMission(text) {
  const t = normalizeText(text);
  const countMatch = t.match(/(\d+)\s*منطقه/);

  if (/نابود/.test(t)) {
    const m = t.match(/ارتش\s+(\S+)\s+را\s+نابود/);
    return { kind: 'destroy', colorWord: m ? m[1] : null, fallbackCount: countMatch ? Number(countMatch[1]) : 24 };
  }
  if (/دست.?کم/.test(t) && countMatch) {
    const u = t.match(/(\d+)\s*واحد/);
    return { kind: 'territories_min_armies', count: Number(countMatch[1]), minArmies: u ? Number(u[1]) : 2 };
  }
  const continents = Object.keys(CONTINENT_NAME_TO_ID)
    .filter((name) => t.includes(name))
    .map((name) => CONTINENT_NAME_TO_ID[name]);
  if (continents.length > 0) return { kind: 'continents', continents };
  if (countMatch) return { kind: 'territories', count: Number(countMatch[1]) };
  return null;
}

function missionCompleted(state, player) {
  const spec = parseMission(player.mission);
  if (!spec) return false;
  const owned = Object.values(state.territories).filter((t) => t.ownerId === player.id);

  switch (spec.kind) {
    case 'territories':
      return owned.length >= spec.count;
    case 'territories_min_armies':
      return owned.filter((t) => t.armies >= spec.minArmies).length >= spec.count;
    case 'continents':
      return spec.continents.every((cid) =>
        CONTINENT_TERRITORIES[cid].every((tid) => state.territories[tid] && state.territories[tid].ownerId === player.id)
      );
    case 'destroy': {
      const targetColor = COLOR_BY_WORD[spec.colorWord];
      const target = state.players.find((p) => p.color === targetColor);
      // هدف وجود ندارد یا خودِ بازیکن است ← ماموریت جایگزین (فتح ۲۴ منطقه)
      if (!target || target.id === player.id) return owned.length >= spec.fallbackCount;
      if (countTerritories(state, target.id) === 0) {
        const by = (state.eliminatedBy || {})[target.id];
        if (by === player.id) return true;
        // هدف را شخص دیگری نابود کرده ← ماموریت جایگزین
        return owned.length >= spec.fallbackCount;
      }
      return false;
    }
    default:
      return false;
  }
}

function setWinner(state, player, reason) {
  state.winner = player.id;
  state.winnerInfo = { id: player.id, name: player.name, color: player.color, reason, mission: player.mission };
  addLog(
    state,
    reason === 'mission'
      ? `🏆 ${player.name} ماموریتش را کامل کرد و برنده شد!`
      : `🏆 ${player.name} همه‌ی قلمروها را فتح کرد و برنده شد!`
  );
}

// ماموریت فقط با اقدامات خودِ بازیکنِ نوبت‌دار کامل می‌شود؛ پس همان را چک می‌کنیم
function checkVictory(room) {
  const state = room.gameState;
  if (!state || state.winner) return;

  const owners = new Set(Object.values(state.territories).map((t) => t.ownerId));
  const active = state.players[state.activePlayerIndex];

  if (active && missionCompleted(state, active)) {
    setWinner(state, active, 'mission');
  } else if (owners.size === 1) {
    const p = state.players.find((x) => x.id === Array.from(owners)[0]);
    if (p) setWinner(state, p, 'world');
  }
}

// حذف کامل یک بازیکن: ثبت قاتل (برای ماموریت‌های «نابود کنید») و گرفتن کارت‌های او
function handleElimination(state, victimId, killerId) {
  state.eliminatedBy = { ...(state.eliminatedBy || {}), [victimId]: killerId };
  const victim = state.players.find((p) => p.id === victimId);
  const killer = state.players.find((p) => p.id === killerId);
  if (!victim || !killer) return;
  if (victim.cards && victim.cards.length > 0) {
    killer.cards = [...(killer.cards || []), ...victim.cards];
    victim.cards = [];
  }
  addLog(state, `💀 ${victim.name} حذف شد (توسط ${killer.name})`);
}

const emitDiceReady = (roomCode, room) => {
  io.in(roomCode).emit('dice_ready_updated', {
    attackerReady: room.attackerReady,
    defenderReady: room.defenderReady,
  });
};

function resetDiceReady(roomCode, room) {
  room.attackerReady = false;
  room.defenderReady = false;
  emitDiceReady(roomCode, room);
}

// هر تغییر state روی سرور یک نسخه‌ی جدید می‌سازد و کلون کامل آن به همه‌ی اعضای روم می‌رود
const broadcastState = (roomCode, room) => {
  io.in(roomCode).emit('game_state_updated', clone(room.gameState));
};

function commitState(roomCode, room) {
  room.gameState.version = (room.gameState.version || 0) + 1;
  touch(room);
  broadcastState(roomCode, room);
}

// رفتن به نوبت بازیکن بعدی؛ بازیکنانِ خارج‌شده و بازیکنانِ بدون قلمرو رد می‌شوند
function advanceToNextPlayer(room) {
  const state = room.gameState;
  const n = state.players.length;
  let nextIndex = -1;

  for (let i = 1; i <= n; i++) {
    const idx = (state.activePlayerIndex + i) % n;
    const gp = state.players[idx];
    const rp = room.players.find((p) => p.name === gp.name);
    const left = rp ? rp.left : true;
    if (!left && countTerritories(state, gp.id) > 0) {
      nextIndex = idx;
      break;
    }
  }

  if (nextIndex === -1) return false;

  const nextPlayer = state.players[nextIndex];
  state.phase = 'reinforce';
  state.activePlayerIndex = nextIndex;
  state.reinforcementsRemaining = reinforcementsFor(state, nextPlayer.id);
  state.turnNumber = (state.turnNumber || 1) + 1;
  state.conqueredTerritoryThisTurn = false;
  clearSelections(state);
  addLog(state, `🎯 نوبت ${nextPlayer.name} شروع شد (${state.reinforcementsRemaining} سرباز)`);
  return true;
}

// ───────────── رد کردن نوبتِ بازیکنِ آفلاین ─────────────

function clearAfkTimer(room) {
  if (room.afkTimer) {
    clearTimeout(room.afkTimer);
    room.afkTimer = null;
  }
}

function scheduleAfkSkip(roomCode, room) {
  clearAfkTimer(room);
  const state = room.gameState;
  if (!state || state.winner) return;

  const active = state.players[state.activePlayerIndex];
  const rp = active && room.players.find((p) => p.name === active.name);
  if (!rp || statusOf(rp) !== 'offline') return;

  const idxAt = state.activePlayerIndex;
  const turnAt = state.turnNumber;

  room.afkTimer = setTimeout(() => {
    room.afkTimer = null;
    if (!rooms[roomCode]) return;
    const s = room.gameState;
    if (!s || s.winner) return;
    const cur = room.players.find((p) => p.name === s.players[s.activePlayerIndex].name);
    if (!cur || statusOf(cur) !== 'offline') return;
    if (s.activePlayerIndex !== idxAt || s.turnNumber !== turnAt) return;

    addLog(s, `⏱️ نوبت ${cur.name} به‌خاطر قطع اتصال رد شد`);
    if (advanceToNextPlayer(room)) {
      resetDiceReady(roomCode, room);
      commitState(roomCode, room);
      scheduleAfkSkip(roomCode, room);
    }
  }, AFK_SKIP_MS);
}

// ───────────── نبرد و تاس (منطق قبلی، بدون تغییر در قوانین) ─────────────

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

// اگر مدافع از بازی خارج شده باشد، تاسِ او خودکار تأیید می‌شود تا نبرد برای همیشه گیر نکند
function applyAutoDefender(room) {
  const s = room.gameState;
  if (!s || !room.attackerReady || !s.selectedTerritoryId || !s.attackTargetId) return;
  const def = s.territories[s.attackTargetId];
  if (!def) return;
  const owner = s.players.find((p) => p.id === def.ownerId);
  if (!owner) return;
  const rp = room.players.find((p) => p.name === owner.name);
  if (rp && rp.left) room.defenderReady = true;
}

function maybeResolveCombat(roomCode, room) {
  if (!room.gameState || !(room.attackerReady && room.defenderReady)) return;

  const state = room.gameState;
  if (state.selectedTerritoryId && state.attackTargetId) {
    const attacker = state.territories[state.selectedTerritoryId];
    const defender = state.territories[state.attackTargetId];

    if (attacker && defender) {
      const attackerPlayer = state.players.find((p) => p.id === attacker.ownerId);
      const fromName = prettyName(state.selectedTerritoryId);
      const toName = prettyName(state.attackTargetId);

      const combat = resolveCombat(attacker.armies, defender.armies);
      const newAttackerArmies = attacker.armies - combat.attackerLosses;
      const newDefenderArmies = defender.armies - combat.defenderLosses;

      let newTerritories = { ...state.territories };
      if (newDefenderArmies <= 0) {
        newTerritories[state.selectedTerritoryId] = { ...attacker, armies: newAttackerArmies - 1 };
        newTerritories[state.attackTargetId] = { id: defender.id, ownerId: attacker.ownerId, armies: 1 };
      } else {
        newTerritories[state.selectedTerritoryId] = { ...attacker, armies: newAttackerArmies };
        newTerritories[state.attackTargetId] = { id: defender.id, ownerId: defender.ownerId, armies: newDefenderArmies };
      }

      state.territories = newTerritories;
      state.selectedTerritoryId = null;
      state.attackTargetId = null;
      state.version = (state.version || 0) + 1;
      state.diceResult = {
        id: state.version, // شناسه‌ی یکتا تا هر کلاینت فقط به‌صورت محلی مودال را ببندد
        attacker: combat.attackerRolls,
        defender: combat.defenderRolls,
        message: newDefenderArmies <= 0 ? '🎉 منطقه فتح شد!' : `تلفات مهاجم: ${combat.attackerLosses} | مدافع: ${combat.defenderLosses}`,
      };

      if (newDefenderArmies <= 0) {
        state.conqueredTerritoryThisTurn = true;
        addLog(state, `🎉 ${attackerPlayer ? attackerPlayer.name : '؟'} منطقه‌ی ${toName} را فتح کرد`);
        const defOwnerId = defender.ownerId;
        if (defOwnerId && defOwnerId !== attacker.ownerId && countTerritories(state, defOwnerId) === 0) {
          handleElimination(state, defOwnerId, attacker.ownerId);
        }
        checkVictory(room);
      } else {
        addLog(state, `⚔️ ${attackerPlayer ? attackerPlayer.name : '؟'} از ${fromName} به ${toName} حمله کرد (تلفات: ${combat.attackerLosses} / ${combat.defenderLosses})`);
      }
    }
  }

  resetDiceReady(roomCode, room);
  touch(room);
  broadcastState(roomCode, room);
}

// ───────────── اتصال/قطع/خروج ─────────────

// قطع شدن یک سوکت؛ بازیکن «آفلاین» می‌شود ولی از بازی بیرون نمی‌رود و می‌تواند برگردد
function detachSocket(socket) {
  const code = socket.roomCode;
  if (!code) return;
  socket.roomCode = null;
  const room = rooms[code];
  try { socket.leave(code); } catch (e) { /* ignore */ }
  if (!room) return;

  const p = room.players.find((x) => x.playerId === socket.playerId);
  if (!p) return;

  p.sockets.delete(socket.id);
  touch(room);
  broadcastPlayers(code, room);
  if (room.gameState) scheduleAfkSkip(code, room);
}

// خروج ارادی بازیکن
function leaveRoom(roomCode, room, player) {
  for (const sid of Array.from(player.sockets)) {
    const s = io.sockets.sockets.get(sid);
    if (s) {
      s.leave(roomCode);
      s.roomCode = null;
      s.emit('left_room', { roomCode });
    }
  }
  player.sockets.clear();

  if (!room.gameState) {
    // در لابی: کاملاً از لیست حذف می‌شود
    room.players = room.players.filter((p) => p !== player);
    if (room.players.length === 0) {
      clearAfkTimer(room);
      delete rooms[roomCode];
      return;
    }
  } else {
    // در بازی: علامت «خارج شده» می‌خورد؛ نوبت‌هایش رد می‌شود ولی با کد روم می‌تواند برگردد
    player.left = true;
    addLog(room.gameState, `🚪 ${player.name} از بازی خارج شد`);
  }

  if (room.hostPlayerId === player.playerId) transferHost(room);
  refreshHostFlags(room);
  touch(room);

  if (room.gameState) {
    const state = room.gameState;
    const active = state.players[state.activePlayerIndex];
    if (!state.winner && active && active.name === player.name) {
      advanceToNextPlayer(room);
      resetDiceReady(roomCode, room);
    } else {
      applyAutoDefender(room);
      emitDiceReady(roomCode, room);
      maybeResolveCombat(roomCode, room);
    }
    commitState(roomCode, room);
    scheduleAfkSkip(roomCode, room);
  }

  broadcastPlayers(roomCode, room);
}

// پاکسازی رومهای رهاشده
setInterval(() => {
  const now = Date.now();
  for (const code of Object.keys(rooms)) {
    const room = rooms[code];
    const anyOnline = room.players.some((p) => statusOf(p) === 'online');
    if (!anyOnline && now - (room.lastActivity || 0) > ROOM_TTL_MS) {
      clearAfkTimer(room);
      delete rooms[code];
    }
  }
}, 10 * 60 * 1000);

// ───────────── رویدادهای سوکت ─────────────

io.on('connection', (socket) => {
  socket.on('create_room', (payload = {}, callback) => {
    const reply = safeCallback(callback);
    const name = cleanName(payload.username);
    const playerId = String(payload.playerId || '');

    if (payload.adminSecret !== ADMIN_SECRET) {
      return reply({ success: false, message: 'رمز عبور ادمین اشتباه است!' });
    }
    if (!name || !playerId) {
      return reply({ success: false, message: 'نام کاربری نامعتبر است.' });
    }

    if (socket.roomCode) detachSocket(socket);

    const roomCode = generateRoomCode();
    const player = { playerId, name, color: COLORS[0], isHost: true, left: false, sockets: new Set([socket.id]) };
    rooms[roomCode] = {
      hostPlayerId: playerId,
      maxPlayers: payload.maxPlayers || 5,
      players: [player],
      gameState: null,
      attackerReady: false,
      defenderReady: false,
      afkTimer: null,
      lastActivity: Date.now(),
      deck: [],
      discard: [],
    };

    socket.roomCode = roomCode;
    socket.playerId = playerId;
    socket.join(roomCode);

    reply({
      success: true,
      roomCode,
      you: { name: player.name, isHost: true },
      players: publicPlayers(rooms[roomCode]),
    });
  });

  // ورود و «ورود مجدد»؛ با همان playerId یا همان نام می‌توان به بازی برگشت
  socket.on('join_room', (payload = {}, callback) => {
    const reply = safeCallback(callback);
    const name = cleanName(payload.username);
    const playerId = String(payload.playerId || '');
    const roomCode = String(payload.roomCode || '').trim();
    const room = rooms[roomCode];

    if (!room) return reply({ success: false, code: 'ROOM_NOT_FOUND', message: 'روم مورد نظر یافت نشد!' });
    if (!name || !playerId) return reply({ success: false, message: 'نام کاربری نامعتبر است.' });

    let player = room.players.find((p) => p.playerId === playerId);

    if (!player) {
      const byName = room.players.find((p) => p.name === name);
      if (byName) {
        // برگشت با همان نام (مثلاً از دستگاه دیگر)؛ فقط وقتی مجاز است که آن بازیکن الان آنلاین نباشد
        if (byName.sockets.size > 0) {
          return reply({ success: false, message: 'این نام کاربری هم‌اکنون در روم فعال است.' });
        }
        player = byName;
        player.playerId = playerId;
        if (room.hostPlayerId && room.players.every((p) => p.playerId !== room.hostPlayerId)) {
          room.hostPlayerId = playerId;
        }
      } else {
        if (room.gameState) {
          return reply({ success: false, message: 'بازی شروع شده و امکان ورود بازیکن جدید نیست.' });
        }
        if (room.players.length >= room.maxPlayers) {
          return reply({ success: false, message: 'ظرفیت تکمیل است!' });
        }
        player = { playerId, name, color: pickColor(room), isHost: false, left: false, sockets: new Set() };
        room.players.push(player);
      }
    }

    if (socket.roomCode && socket.roomCode !== roomCode) detachSocket(socket);

    const wasLeft = player.left;
    player.left = false;
    player.sockets.add(socket.id);
    socket.roomCode = roomCode;
    socket.playerId = playerId;
    socket.join(roomCode);

    if (!room.hostPlayerId) room.hostPlayerId = playerId;
    refreshHostFlags(room);
    touch(room);

    if (room.gameState && wasLeft) {
      addLog(room.gameState, `↩️ ${player.name} به بازی برگشت`);
      commitState(roomCode, room);
    }
    if (room.gameState) scheduleAfkSkip(roomCode, room);

    reply({
      success: true,
      roomCode,
      you: { name: player.name, isHost: player.isHost },
      players: publicPlayers(room),
      gameState: room.gameState ? clone(room.gameState) : null,
      attackerReady: room.attackerReady,
      defenderReady: room.defenderReady,
    });

    broadcastPlayers(roomCode, room);
  });

  socket.on('leave_room', ({ roomCode } = {}, callback) => {
    const reply = safeCallback(callback);
    const room = rooms[roomCode];
    if (!room) return reply({ success: true });
    const player = playerOf(room, socket);
    if (!player) return reply({ success: true });
    leaveRoom(roomCode, room, player);
    reply({ success: true });
  });

  socket.on('request_room_players', ({ roomCode } = {}) => {
    const room = rooms[roomCode];
    if (room) broadcastPlayers(roomCode, room);
  });

  socket.on('start_game', ({ roomCode, initialState } = {}, callback) => {
    const reply = safeCallback(callback);
    const room = rooms[roomCode];
    if (!room || !initialState) return reply({ success: false, message: 'روم یافت نشد.' });

    const player = playerOf(room, socket);
    if (!player || !player.isHost) {
      return reply({ success: false, message: 'فقط سازنده‌ی روم می‌تواند بازی را شروع کند.' });
    }
    if (room.gameState) {
      return reply({ success: false, message: 'بازی قبلاً شروع شده است.' });
    }

    initialState.version = 1;
    initialState.turnNumber = initialState.turnNumber || 1;
    initialState.log = [];
    initialState.winner = null;
    initialState.winnerInfo = null;
    initialState.eliminatedBy = {};
    initialState.cardTradeCount = 0;
    initialState.conqueredTerritoryThisTurn = false;
    initialState.players.forEach((p) => { p.cards = []; });
    delete initialState.deck;

    // دسته‌ی کارت‌ها فقط روی سرور نگه داشته می‌شود و برای کلاینت‌ها ارسال نمی‌شود
    room.deck = buildDeck(Object.keys(initialState.territories));
    room.discard = [];

    const firstPlayer = initialState.players[initialState.activePlayerIndex || 0];
    if (firstPlayer) {
      initialState.reinforcementsRemaining = reinforcementsFor(initialState, firstPlayer.id);
    }
    addLog(initialState, '🚀 بازی شروع شد');
    const first = initialState.players && initialState.players[initialState.activePlayerIndex || 0];
    if (first) addLog(initialState, `🎯 نوبت ${first.name} شروع شد`);

    room.gameState = initialState;
    room.attackerReady = false;
    room.defenderReady = false;
    touch(room);

    io.in(roomCode).emit('game_started', clone(initialState));
    emitDiceReady(roomCode, room);
    scheduleAfkSkip(roomCode, room);
    reply({ success: true });
  });

  socket.on('set_dice_status', ({ roomCode, role, readyState } = {}) => {
    const room = rooms[roomCode];
    if (!room || !room.gameState || room.gameState.winner) return;

    if (role === 'attacker') room.attackerReady = readyState;
    if (role === 'defender') room.defenderReady = readyState;

    applyAutoDefender(room);
    emitDiceReady(roomCode, room);
    maybeResolveCombat(roomCode, room);
  });

  // تغییر فاز و نوبت: فقط و فقط در سرور و فقط توسط بازیکن نوبت‌دار
  socket.on('next_phase_or_turn', ({ roomCode } = {}, callback) => {
    const reply = safeCallback(callback);
    const room = rooms[roomCode];
    if (!room || !room.gameState) {
      return reply({ success: false, code: 'ROOM_NOT_FOUND', message: 'روم یا بازی یافت نشد.' });
    }

    const state = room.gameState;

    if (state.winner) {
      return reply({ success: false, message: 'بازی تمام شده است.', state: clone(state) });
    }
    if (!isActivePlayerSocket(room, socket, roomCode)) {
      return reply({ success: false, message: 'نوبت شما نیست.', state: clone(state) });
    }

    if (state.phase === 'reinforce') {
      if (state.reinforcementsRemaining > 0) {
        return reply({ success: false, message: 'هنوز سرباز برای قرار دادن دارید.', state: clone(state) });
      }
      state.phase = 'attack';
    } else if (state.phase === 'attack') {
      state.phase = 'fortify';
      awardCardIfEarned(room); // حداقل یک فتح موفق = یک کارت
    } else if (state.phase === 'fortify') {
      if (!advanceToNextPlayer(room)) {
        return reply({ success: false, message: 'بازیکن فعالی برای ادامه‌ی بازی نیست.', state: clone(state) });
      }
    }

    clearSelections(state);

    resetDiceReady(roomCode, room);
    commitState(roomCode, room);
    scheduleAfkSkip(roomCode, room);
    reply({ success: true });
  });

  // به‌روزرسانی نقشه/سرباز/کارت/انتخاب‌ها توسط بازیکن نوبت‌دار
  // فیلدهای phase / activePlayerIndex / turnNumber / diceResult / log / winner هرگز از کلاینت پذیرفته نمی‌شوند
  socket.on('update_game_state', ({ roomCode, newState, baseVersion } = {}, callback) => {
    const reply = safeCallback(callback);
    const room = rooms[roomCode];
    if (!room || !room.gameState || !newState) {
      return reply({ success: false, code: 'ROOM_NOT_FOUND', message: 'روم یا بازی یافت نشد.' });
    }

    const current = room.gameState;

    if (current.winner) {
      return reply({ success: false, message: 'بازی تمام شده است.', state: clone(current) });
    }
    if (!isActivePlayerSocket(room, socket, roomCode)) {
      return reply({ success: false, message: 'نوبت شما نیست.', state: clone(current) });
    }
    if (baseVersion !== (current.version || 0)) {
      return reply({ success: false, stale: true, message: 'نسخه‌ی state قدیمی است.', state: clone(current) });
    }

    const next = clone(newState);
    next.phase = current.phase;
    next.activePlayerIndex = current.activePlayerIndex;
    next.turnNumber = current.turnNumber;
    next.diceResult = current.diceResult || null;
    next.log = current.log || [];
    next.winner = current.winner || null;
    next.winnerInfo = current.winnerInfo || null;
    next.eliminatedBy = current.eliminatedBy || {};
    next.players = current.players; // کارت‌ها فقط از مسیر سرور تغییر می‌کنند
    next.cardTradeCount = current.cardTradeCount || 0;
    next.conqueredTerritoryThisTurn = !!current.conqueredTerritoryThisTurn;
    next.version = (current.version || 0) + 1;

    room.gameState = next;
    touch(room);
    checkVictory(room);

    if (!next.attackTargetId || !next.selectedTerritoryId) {
      resetDiceReady(roomCode, room);
    }

    broadcastState(roomCode, room);
    reply({ success: true });
  });

  // مبادله‌ی کارت: فقط بازیکن نوبت‌دار، فقط در فاز تقویت؛ پاداش را خود سرور حساب می‌کند
  socket.on('trade_cards', ({ roomCode, cardIds } = {}, callback) => {
    const reply = safeCallback(callback);
    const room = rooms[roomCode];
    if (!room || !room.gameState) {
      return reply({ success: false, code: 'ROOM_NOT_FOUND', message: 'روم یا بازی یافت نشد.' });
    }
    const state = room.gameState;

    if (state.winner) return reply({ success: false, message: 'بازی تمام شده است.', state: clone(state) });
    if (!isActivePlayerSocket(room, socket, roomCode)) {
      return reply({ success: false, message: 'نوبت شما نیست.', state: clone(state) });
    }
    if (state.phase !== 'reinforce') {
      return reply({ success: false, message: 'مبادله‌ی کارت فقط در فاز تقویت مجاز است.', state: clone(state) });
    }

    const ids = Array.isArray(cardIds) ? Array.from(new Set(cardIds)) : [];
    const player = state.players[state.activePlayerIndex];
    const selected = ids.map((id) => (player.cards || []).find((c) => c.id === id));
    if (ids.length < 2 || ids.length > 3 || selected.some((c) => !c)) {
      return reply({ success: false, message: 'کارت‌های انتخاب‌شده نامعتبر است.', state: clone(state) });
    }

    const result = evaluateCardSet(selected);
    if (!result.valid) {
      return reply({ success: false, message: 'این ترکیب کارت طبق قوانین قابل مبادله نیست.', state: clone(state) });
    }

    player.cards = player.cards.filter((c) => !ids.includes(c.id));
    room.discard = [...(room.discard || []), ...selected];
    state.reinforcementsRemaining += result.bonus;
    state.cardTradeCount = (state.cardTradeCount || 0) + 1;
    addLog(state, `🔄 ${player.name} کارت‌ها را مبادله کرد و ${result.bonus} سرباز گرفت`);

    commitState(roomCode, room);
    reply({ success: true, bonus: result.bonus });
  });

  socket.on('disconnect', () => {
    detachSocket(socket);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`[server v4 - cards/missions] سرور روی پورت ${PORT} فعال است.`);
});

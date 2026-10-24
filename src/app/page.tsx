'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Map } from '@/components/Map';
import { DiceModal } from '@/components/DiceModal';
import { CardModal } from '@/components/CardModal';
import { HelpModal } from '@/components/HelpModal';
import { initializeGame } from '@/game/engine/setup';
import { GameState, Card } from '@/game/engine/state';
import { TERRITORIES, CONTINENTS } from '@/game/data/territories';
import { socket } from '@/game/socket';
import { FortifyModal } from '@/components/FortifyModal';
import { AdminRoomsPanel, AdminRoomInfo } from '@/components/AdminRoomsPanel';
import { getMissionProgress } from '@/game/engine/missionProgress';

const getVersion = (s: any): number => (s && typeof s.version === 'number' ? s.version : 0);

const emitAck = (event: string, payload: any, timeoutMs = 8000): Promise<any> =>
  new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ success: false, timeout: true, message: 'سرور پاسخ نداد.' });
    }, timeoutMs);
    socket.emit(event, payload, (res: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res);
    });
  });

const PHASES = [
  { id: 'reinforce', icon: '🛡️', label: 'تقویت' },
  { id: 'attack', icon: '⚔️', label: 'حمله' },
  { id: 'fortify', icon: '🧭', label: 'جابجایی' },
] as const;

const CONTINENT_LABEL: Record<string, string> = {
  na: 'آ.شمالی',
  sa: 'آ.جنوبی',
  eu: 'اروپا',
  af: 'آفریقا',
  as: 'آسیا',
  au: 'استرالیا',
};

type ToastKind = 'info' | 'success' | 'error';
type ToastItem = { id: number; text: string; kind: ToastKind };
type ConnStatus = 'connecting' | 'connected' | 'reconnecting';

const STATUS_META: Record<string, { label: string; dot: string }> = {
  online: { label: 'آنلاین', dot: 'bg-emerald-400' },
  offline: { label: 'قطع اتصال', dot: 'bg-orange-400 animate-pulse' },
  left: { label: 'خارج شده', dot: 'bg-gray-500' },
};

export default function RiskGamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showMissionModal, setShowMissionModal] = useState<boolean>(false);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [dismissedDiceId, setDismissedDiceId] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [showLogPanel, setShowLogPanel] = useState<boolean>(false);
  const [winnerDismissed, setWinnerDismissed] = useState<boolean>(false);

  const [showFortifyModal, setShowFortifyModal] = useState<boolean>(false);
  const [fortifyTargetId, setFortifyTargetId] = useState<string | null>(null);
  const [fortifyAmount, setFortifyAmount] = useState<number>(1);

  const [booting, setBooting] = useState<boolean>(true);
  const [connStatus, setConnStatus] = useState<ConnStatus>('connecting');
  const [inLobby, setInLobby] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [lastRoom, setLastRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [adminSecretInput, setAdminSecretInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showConnPill, setShowConnPill] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [adminRooms, setAdminRooms] = useState<AdminRoomInfo[]>([]);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

  const [attackerReady, setAttackerReady] = useState<boolean>(false);
  const [defenderReady, setDefenderReady] = useState<boolean>(false);
  const [selectedDiceCount, setSelectedDiceCount] = useState<number>(3);

  const myNameRef = useRef<string>('');
  const rejoinInFlight = useRef<boolean>(false);
  const rejoinAttempts = useRef<number>(0);
  const hasJoinedRef = useRef<boolean>(false);
  const toastIdRef = useRef<number>(0);
  const wasDisconnectedRef = useRef<boolean>(false);
  const disconnectedAtRef = useRef<number>(0);
  const prevStatusRef = useRef<Record<string, string>>({});
  const prevTurnKeyRef = useRef<string | null>(null);
  const prevCardCountRef = useRef<number | null>(null);

  const pushToast = (text: string, kind: ToastKind = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const getOrCreatePlayerId = () => {
    let pid = localStorage.getItem('risk_player_id');
    if (!pid) {
      pid = 'pid_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem('risk_player_id', pid);
    }
    return pid;
  };

  const applyServerState = (incoming: any, force: boolean = false) => {
    if (!incoming) return;
    const cloned: GameState = JSON.parse(JSON.stringify(incoming));
    setGameState((prev) => {
      if (!force && prev && getVersion(incoming) < getVersion(prev)) return prev;
      return cloned;
    });
    if (!incoming.attackTargetId || !incoming.selectedTerritoryId) {
      setAttackerReady(false);
      setDefenderReady(false);
      setSelectedDiceCount(3);
    }
  };

  const resetToLobby = () => {
    localStorage.removeItem('risk_roomCode');
    hasJoinedRef.current = false;
    prevStatusRef.current = {};
    prevTurnKeyRef.current = null;
    setCurrentRoomCode(null);
    setGameState(null);
    setPlayersList([]);
    setIsHost(false);
    setInLobby(true);
    setAttackerReady(false);
    setDefenderReady(false);
    setSelectedDiceCount(3);
    setDismissedDiceId(null);
    setWinnerDismissed(false);
    setShowFortifyModal(false);
    setShowCardModal(false);
    setShowMissionModal(false);
    setShowLeaveModal(false);
    setShowLogPanel(false);
    setLastRoom(localStorage.getItem('risk_lastRoom'));
  };

  const applyJoinSuccess = (res: any, fallbackName: string) => {
    const name = res.you?.name || fallbackName;
    myNameRef.current = name;
    setUsername(name);
    localStorage.setItem('risk_username', name);
    localStorage.setItem('risk_roomCode', res.roomCode);
    localStorage.setItem('risk_lastRoom', res.roomCode);
    setLastRoom(res.roomCode);
    setCurrentRoomCode(res.roomCode);
    setPlayersList(res.players || []);
    setIsHost(!!res.you?.isHost);
    setAttackerReady(!!res.attackerReady);
    setDefenderReady(!!res.defenderReady);
    if (res.attackerSelectedDice) setSelectedDiceCount(res.attackerSelectedDice);

    prevStatusRef.current = (res.players || []).reduce((acc: Record<string, string>, p: any) => {
      acc[p.name] = p.status;
      return acc;
    }, {});

    if (res.gameState) {
      if (!hasJoinedRef.current) setDismissedDiceId(res.gameState.diceResult?.id ?? null);
      applyServerState(res.gameState, true);
      setInLobby(false);
    } else {
      setInLobby(true);
    }
    hasJoinedRef.current = true;
  };

  const rejoinRoom = async () => {
    const savedUsername = localStorage.getItem('risk_username');
    const savedRoomCode = localStorage.getItem('risk_roomCode');
    if (!savedRoomCode || !savedUsername) {
      setBooting(false);
      return;
    }
    if (rejoinInFlight.current) return;
    rejoinInFlight.current = true;

    try {
      const res = await emitAck(
        'join_room',
        { username: savedUsername, playerId: getOrCreatePlayerId(), roomCode: savedRoomCode },
        10000
      );

      if (res?.success) {
        rejoinAttempts.current = 0;
        applyJoinSuccess(res, savedUsername);
        setBooting(false);
      } else if (res?.timeout) {
        rejoinAttempts.current += 1;
        if (rejoinAttempts.current < 6) {
          setTimeout(rejoinRoom, 3000);
        } else {
          setBooting(false);
          setErrorMessage('اتصال به سرور برقرار نشد. کمی بعد دوباره امتحان کنید.');
        }
      } else if (res?.code === 'ROOM_NOT_FOUND') {
        resetToLobby();
        setErrorMessage('این روم دیگر وجود ندارد. یک روم جدید بسازید.');
        setBooting(false);
      } else {
        setErrorMessage(res?.message || 'ورود مجدد به روم ممکن نشد.');
        setBooting(false);
      }
    } finally {
      rejoinInFlight.current = false;
    }
  };

  const reinitializeSocketConnection = () => {
    if (!socket.connected) {
      socket.connect();
      return;
    }
    rejoinRoom();
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('risk_username') || '';
    const savedRoom = localStorage.getItem('risk_roomCode');
    if (savedUser) {
      setUsername(savedUser);
      myNameRef.current = savedUser;
    }
    setLastRoom(localStorage.getItem('risk_lastRoom'));

    const urlRoom = new URLSearchParams(window.location.search).get('room');
    if (urlRoom) setRoomCodeInput(urlRoom.replace(/\D/g, '').slice(0, 6));

    setConnStatus(socket.connected ? 'connected' : 'connecting');

    if (savedUser && savedRoom) {
      reinitializeSocketConnection();
    } else {
      setBooting(false);
      if (!socket.connected) socket.connect();
    }

    const onConnect = () => {
      setConnStatus('connected');
      if (wasDisconnectedRef.current) {
        wasDisconnectedRef.current = false;
        if (Date.now() - disconnectedAtRef.current > 15000) {
          pushToast('اتصال به سرور دوباره برقرار شد', 'success');
        }
      }
      rejoinRoom();
    };

    const onDisconnect = (reason: string) => {
      if (!wasDisconnectedRef.current) disconnectedAtRef.current = Date.now();
      wasDisconnectedRef.current = true;
      setConnStatus('reconnecting');
      if (reason === 'io server disconnect') socket.connect();
    };

    const onConnectError = () => setConnStatus('reconnecting');
    const onVisibility = () => { if (document.visibilityState === 'visible') reinitializeSocketConnection(); };
    const onBrowserOnline = () => { if (!socket.connected) socket.connect(); };

    const onRoomUpdated = ({ players }: { players: any[] }) => {
      setPlayersList(players);
      const prev = prevStatusRef.current;
      players.forEach((p) => {
        const old = prev[p.name];
        if (old && old !== p.status && p.name !== myNameRef.current) {
          if (p.status === 'offline') pushToast(`${p.name} اتصالش قطع شد`, 'info');
          else if (p.status === 'left') pushToast(`${p.name} از بازی خارج شد`, 'info');
          else if (p.status === 'online') pushToast(`${p.name} برگشت`, 'success');
        }
      });
      prevStatusRef.current = players.reduce((acc: Record<string, string>, p: any) => {
        acc[p.name] = p.status;
        return acc;
      }, {});

      const me = players.find((p) => p.name === myNameRef.current);
      if (me) setIsHost(me.isHost);
    };

    const onGameStarted = (initialState: any) => {
      const firstName = initialState?.players?.[initialState.activePlayerIndex]?.name;
      if (firstName) pushToast(`🎲 قرعه‌کشی انجام شد: ${firstName} بازی را شروع می‌کند`, 'info');
      applyServerState(initialState, true);
      setDismissedDiceId(null);
      setWinnerDismissed(false);
      setAttackerReady(false);
      setDefenderReady(false);
      setSelectedDiceCount(3);
      setInLobby(false);
    };

    const onGameStateUpdated = (newState: any) => applyServerState(newState);

    const onDiceReady = ({ attackerReady: aReady, defenderReady: dReady, attackerSelectedDice }: any) => {
      setAttackerReady(aReady);
      setDefenderReady(dReady);
      if (attackerSelectedDice) setSelectedDiceCount(attackerSelectedDice);
    };

    const onLeftRoom = () => resetToLobby();

    const onRoomClosed = (payload: { roomCode?: string; reason?: string }) => {
      if (payload?.roomCode && localStorage.getItem('risk_lastRoom') === payload.roomCode) {
        localStorage.removeItem('risk_lastRoom');
      }
      resetToLobby();
      const msg = payload?.reason || 'این روم بسته شد.';
      setErrorMessage(msg);
      pushToast(msg, 'error');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onBrowserOnline);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room_updated', onRoomUpdated);
    socket.on('game_started', onGameStarted);
    socket.on('game_state_updated', onGameStateUpdated);
    socket.on('dice_ready_updated', onDiceReady);
    socket.on('left_room', onLeftRoom);
    socket.on('room_closed', onRoomClosed);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onBrowserOnline);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room_updated', onRoomUpdated);
      socket.off('game_started', onGameStarted);
      socket.off('game_state_updated', onGameStateUpdated);
      socket.off('dice_ready_updated', onDiceReady);
      socket.off('left_room', onLeftRoom);
      socket.off('room_closed', onRoomClosed);
    };
  }, []);

  useEffect(() => {
    if (!gameState) {
      document.title = 'Risk';
      return;
    }
    const ap = gameState.players[gameState.activePlayerIndex];
    const mine = !!ap && ap.name === username;
    const key = `${(gameState as any).turnNumber ?? 0}:${ap?.name}`;
    if (prevTurnKeyRef.current !== null && prevTurnKeyRef.current !== key && mine) {
      pushToast('🎯 نوبت شماست! سربازهای خود را بگذارید.', 'success');
    }
    prevTurnKeyRef.current = key;
    document.title = mine ? '🎯 نوبت شماست — Risk' : 'Risk';
  }, [gameState?.activePlayerIndex, (gameState as any)?.turnNumber, username]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowHelpModal(false);
      setShowMissionModal(false);
      setShowCardModal(false);
      setShowLeaveModal(false);
      setShowFortifyModal(false);
      setShowAdminPanel(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (connStatus === 'connected') {
      setShowConnPill(false);
      return;
    }
    const t = setTimeout(() => setShowConnPill(true), 8000);
    return () => clearTimeout(t);
  }, [connStatus]);

  const myCardCount = gameState?.players.find((p) => p.name === username)?.cards.length ?? null;
  useEffect(() => {
    if (myCardCount === null) {
      prevCardCountRef.current = null;
      return;
    }
    if (prevCardCountRef.current !== null && myCardCount > prevCardCountRef.current) {
      pushToast('🃏 به‌خاطر فتح در نوبت قبل، یک کارت جدید گرفتید!', 'success');
    }
    prevCardCountRef.current = myCardCount;
  }, [myCardCount]);

  const handleCreateRoom = async () => {
    setErrorMessage('');
    const name = username.trim();
    if (!name || !adminSecretInput.trim()) {
      setErrorMessage('لطفاً نام کاربری و رمز ادمین را وارد کنید.');
      return;
    }
    if (!socket.connected) {
      socket.connect();
      setErrorMessage('ارتباط با سرور برقرار نیست. چند ثانیه بعد دوباره امتحان کنید.');
      return;
    }
    setIsLoading(true);
    const res = await emitAck(
      'create_room',
      { username: name, playerId: getOrCreatePlayerId(), maxPlayers: 5, adminSecret: adminSecretInput },
      15000
    );
    setIsLoading(false);
    if (res?.success) {
      hasJoinedRef.current = false;
      applyJoinSuccess(res, name);
    } else {
      setErrorMessage(res?.message || 'خطا در ساخت روم.');
    }
  };

  const doJoin = async (code: string) => {
    setErrorMessage('');
    const name = username.trim();
    const cleanCode = code.trim();
    if (!name || !cleanCode) {
      setErrorMessage('لطفاً نام کاربری و کد روم را وارد کنید.');
      return;
    }
    if (!socket.connected) {
      socket.connect();
      setErrorMessage('ارتباط با سرور برقرار نیست. چند ثانیه بعد دوباره امتحان کنید.');
      return;
    }
    setIsLoading(true);
    const res = await emitAck(
      'join_room',
      { username: name, playerId: getOrCreatePlayerId(), roomCode: cleanCode },
      15000
    );
    setIsLoading(false);
    if (res?.success) {
      hasJoinedRef.current = false;
      applyJoinSuccess(res, name);
    } else {
      setErrorMessage(res?.message || 'کد روم نامعتبر است.');
    }
  };

  const handleJoinRoom = () => doJoin(roomCodeInput);
  const handleRefreshPlayers = () => { if (currentRoomCode) socket.emit('request_room_players', { roomCode: currentRoomCode }); };

  const handleStartOnlineGame = async () => {
    if (playersList.length < 1) return;
    const initial = initializeGame(
      playersList.map((p) => ({ name: p.name, color: p.color, isAI: false }))
    );
    const activeP = initial.players[0];
    const myTerritoriesCount = Object.values(initial.territories).filter(t => t.ownerId === activeP.id).length;
    initial.reinforcementsRemaining = Math.max(3, Math.floor(myTerritoriesCount / 3));

    const res = await emitAck('start_game', { roomCode: currentRoomCode, initialState: initial }, 10000);
    if (res && !res.success) {
      pushToast(res.message || 'شروع بازی ممکن نشد.', 'error');
    }
  };

  const loadAdminRooms = async (): Promise<boolean> => {
    if (!socket.connected) {
      socket.connect();
      setErrorMessage('ارتباط با سرور برقرار نیست.');
      return false;
    }
    setAdminLoading(true);
    const res = await emitAck('admin_list_rooms', { adminSecret: adminSecretInput }, 12000);
    setAdminLoading(false);
    if (res?.success) {
      setAdminRooms(res.rooms || []);
      return true;
    }
    setErrorMessage(res?.message || 'دریافت لیست روم‌ها ممکن نشد.');
    return false;
  };

  const openAdminPanel = async () => {
    setErrorMessage('');
    if (!adminSecretInput.trim()) {
      setErrorMessage('برای مدیریت روم‌ها ابتدا رمز عبور ادمین را وارد کنید.');
      return;
    }
    if (await loadAdminRooms()) setShowAdminPanel(true);
  };

  const forgetRoomLocally = (code: string) => {
    if (localStorage.getItem('risk_lastRoom') === code) {
      localStorage.removeItem('risk_lastRoom');
      setLastRoom(null);
    }
    if (localStorage.getItem('risk_roomCode') === code) localStorage.removeItem('risk_roomCode');
  };

  const deleteAdminRoom = async (code: string) => {
    const res = await emitAck('admin_delete_room', { adminSecret: adminSecretInput, roomCode: code }, 8000);
    if (res?.success) {
      forgetRoomLocally(code);
      pushToast(`روم ${code} حذف شد`, 'success');
    } else {
      pushToast(res?.message || 'حذف روم ممکن نشد.', 'error');
    }
    await loadAdminRooms();
  };

  const deleteIdleRooms = async () => {
    const before = adminRooms.map((r) => r.code);
    const res = await emitAck('admin_delete_idle_rooms', { adminSecret: adminSecretInput }, 8000);
    if (res?.success) {
      pushToast(res.removed ? `${res.removed} روم غیرفعال حذف شد` : 'روم غیرفعالی وجود نداشت', 'success');
    } else {
      pushToast(res?.message || 'پاکسازی ممکن نشد.', 'error');
    }
    await loadAdminRooms();
    setAdminRooms((current) => {
      const alive = new Set(current.map((r) => r.code));
      before.filter((c) => !alive.has(c)).forEach(forgetRoomLocally);
      return current;
    });
  };

  const handleLeaveRoom = async () => {
    const code = currentRoomCode;
    setShowLeaveModal(false);
    if (code && socket.connected) {
      await emitAck('leave_room', { roomCode: code }, 5000);
    }
    resetToLobby();
    pushToast(code ? `از روم خارج شدید. برای بازگشت، کد ${code} را وارد کنید.` : 'از روم خارج شدید.', 'info');
  };

  const copyText = async (text: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast(okMsg, 'success');
    } catch {
      pushToast('کپی انجام نشد.', 'error');
    }
  };

  const copyInviteLink = () => {
    if (!currentRoomCode) return;
    copyText(`${window.location.origin}${window.location.pathname}?room=${currentRoomCode}`, 'لینک دعوت کپی شد');
  };

  const overlays = (
    <>
      {connStatus !== 'connected' && showConnPill && (
        <div className="fixed bottom-3 left-3 z-[60] pointer-events-none text-[10px] font-bold text-amber-200/90 bg-[#2b1e16]/90 border border-amber-700/50 rounded-full px-3 py-1 shadow" dir="rtl">
          {connStatus === 'connecting' ? '⏳ در حال اتصال به سرور...' : '🔌 اتصال ضعیف...'}
        </div>
      )}
      <div className="fixed bottom-4 inset-x-0 z-[70] flex flex-col items-center gap-2 pointer-events-none px-4" dir="rtl">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm w-full text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border pointer-events-auto ${t.kind === 'success' ? 'bg-emerald-900 border-emerald-500 text-emerald-100' : t.kind === 'error' ? 'bg-red-900 border-red-500 text-red-100' : 'bg-[#2b1e16] border-amber-600 text-amber-100'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </>
  );

  if (booting) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#1a120b] text-amber-100" dir="rtl">
        {overlays}
        <div className="text-center space-y-5 max-w-sm bg-[#2b1e16] p-8 rounded-3xl border-2 border-[#8c653d] shadow-2xl w-full">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-amber-400">در حال بازگشت به بازی...</h2>
          <button onClick={() => { localStorage.removeItem('risk_roomCode'); setBooting(false); }} className="text-[11px] text-red-400 hover:underline cursor-pointer">انصراف و رفتن به لابی</button>
        </div>
      </main>
    );
  }

  if (inLobby && !currentRoomCode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#1a120b] text-amber-100" dir="rtl">
        {overlays}
        {showAdminPanel && (
          <AdminRoomsPanel rooms={adminRooms} loading={adminLoading} onRefresh={loadAdminRooms} onDelete={deleteAdminRoom} onDeleteIdle={deleteIdleRooms} onClose={() => setShowAdminPanel(false)} />
        )}
        <div className="text-center space-y-6 max-w-md bg-[#2b1e16] p-8 rounded-3xl border-2 border-[#8c653d] shadow-2xl w-full">
          <h1 className="text-4xl font-black text-amber-400 font-serif">RISK GAME</h1>
          {errorMessage && <div className="bg-red-900 text-white text-xs p-3 rounded-xl">{errorMessage}</div>}
          <input type="text" value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} placeholder="نام کاربری شما..." className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-2.5 text-sm text-amber-100" />
          {lastRoom && (
            <button onClick={() => doJoin(lastRoom)} disabled={isLoading} className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 font-bold text-sm rounded-xl text-white cursor-pointer">
              ↩️ بازگشت به آخرین روم ({lastRoom})
            </button>
          )}
          <div className="relative flex items-center w-full">
            <input type={showPassword ? "text" : "password"} value={adminSecretInput} onChange={(e) => setAdminSecretInput(e.target.value)} placeholder="رمز عبور ادمین..." className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-3 pl-12 text-xs text-amber-100 font-mono" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 text-amber-400 cursor-pointer">👁️</button>
          </div>
          <button onClick={handleCreateRoom} disabled={isLoading} className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-sm rounded-xl text-white cursor-pointer">🛠️ ساخت روم جدید (ادمین)</button>
          <button onClick={openAdminPanel} disabled={adminLoading} className="w-full py-2.5 bg-[#3a2a1d] hover:bg-[#4a3626] border border-[#8c653d]/70 font-bold text-xs rounded-xl text-amber-200 cursor-pointer">🗂️ مدیریت و حذف روم‌ها (ادمین)</button>
          <div className="pt-3 border-t border-[#8c653d]/40 space-y-2">
            <input type="text" inputMode="numeric" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => { if (e.key === 'Enter') handleJoinRoom(); }} placeholder="کد ۶ رقمی روم" className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-2.5 text-sm text-amber-100 text-center font-mono" />
            <button onClick={handleJoinRoom} disabled={isLoading} className="w-full py-3 bg-blue-700 hover:bg-blue-600 font-bold text-sm rounded-xl text-white cursor-pointer">🔗 ورود به روم با کد</button>
          </div>
        </div>
      </main>
    );
  }

  if (inLobby && currentRoomCode && !gameState) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#1a120b] text-amber-100" dir="rtl">
        {overlays}
        <div className="text-center space-y-6 max-w-md bg-[#2b1e16] p-8 rounded-3xl border-2 border-amber-600 w-full shadow-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-amber-400">اتاق انتظار آنلاین</h2>
            <button onClick={handleRefreshPlayers} className="text-xs bg-amber-800 hover:bg-amber-700 text-amber-200 px-3 py-1 rounded-lg cursor-pointer">🔄 بروزرسانی</button>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-mono font-extrabold text-emerald-400 tracking-widest">{currentRoomCode}</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => copyText(currentRoomCode, 'کد روم کپی شد')} className="text-[11px] bg-[#1a120b] border border-[#8c653d] hover:border-amber-400 px-3 py-1 rounded-lg cursor-pointer">📋 کپی کد</button>
              <button onClick={copyInviteLink} className="text-[11px] bg-[#1a120b] border border-[#8c653d] hover:border-amber-400 px-3 py-1 rounded-lg cursor-pointer">🔗 کپی لینک دعوت</button>
            </div>
          </div>
          <div className="space-y-2 text-right bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]">
            <p className="text-xs font-bold text-amber-400 mb-2">بازیکنان حاضر ({playersList.length} نفر):</p>
            {playersList.map((p, idx) => {
              const meta = STATUS_META[p.status] || STATUS_META.online;
              return (
                <div key={idx} className="flex justify-between items-center text-xs bg-[#2b1e16] p-2.5 rounded-lg border border-[#8c653d]/30">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    <span style={{ color: p.color }} className="font-bold">{p.name}</span>
                    {p.name === username && <span className="text-[10px] text-amber-300">(شما)</span>}
                  </span>
                  {p.isHost && <span className="bg-amber-600 text-white px-2 py-0.5 rounded text-[10px]">Host</span>}
                </div>
              );
            })}
          </div>
          {isHost ? (
            <button onClick={handleStartOnlineGame} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm rounded-xl text-white cursor-pointer shadow-lg">🚀 شروع بازی آنلاین</button>
          ) : (
            <p className="text-xs text-amber-400 animate-pulse py-3">منتظر بمانید تا سازنده روم بازی را شروع کند...</p>
          )}
          <button onClick={handleLeaveRoom} className="text-[11px] text-red-400 hover:underline cursor-pointer pt-2">🚪 خروج از روم</button>
        </div>
      </main>
    );
  }

  if (!gameState) return <div className="text-white text-center mt-20 text-lg">{overlays}در حال بارگذاری...</div>;

  const localPlayer = gameState.players.find((p) => p.name === username) || gameState.players[0];
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer.name === username;

  const attackerTerritory = gameState.selectedTerritoryId ? gameState.territories[gameState.selectedTerritoryId] : null;
  const defenderTerritory = gameState.attackTargetId ? gameState.territories[gameState.attackTargetId] : null;

  const attackerPlayer = attackerTerritory ? gameState.players.find(p => p.id === attackerTerritory.ownerId) : null;
  const defenderPlayer = defenderTerritory ? gameState.players.find(p => p.id === defenderTerritory.ownerId) : null;

  const isAttacker = attackerPlayer?.name === username;
  const isDefender = defenderPlayer?.name === username;
  const defenderLeft = !!defenderPlayer && playersList.find((p) => p.name === defenderPlayer.name)?.status === 'left';

  const winner = (gameState as any).winnerInfo as { id: string; name: string; color: string; reason?: 'mission' | 'world'; mission?: string } | null | undefined;
  const logEntries: { t: number; text: string }[] = ((gameState as any).log as any[]) || [];

  const territoryName = (id: string) => TERRITORIES.find((t) => t.id === id)?.name ?? id;
  const missionProgress = getMissionProgress(localPlayer.mission, gameState, localPlayer.id);

  const phaseHint = (() => {
    if (winner) return '🏆 بازی تمام شده است.';
    if (!isMyTurn) return `⏳ منتظر حرکت ${activePlayer.name} هستید...`;
    if (gameState.phase === 'reinforce') {
      return gameState.reinforcementsRemaining > 0
        ? `روی قلمروهای خود کلیک کنید (${gameState.reinforcementsRemaining} سرباز باقی مانده).`
        : '«مرحله بعد» را بزنید.';
    }
    if (gameState.phase === 'attack') {
      if (!gameState.selectedTerritoryId) return 'قلمرو خود برای حمله را انتخاب کنید.';
      if (!gameState.attackTargetId) return 'قلمرو دشمن را برای حمله انتخاب کنید.';
      return 'تعداد تاس خود را انتخاب کرده و آماده نبرد شوید.';
    }
    if (!gameState.fortifySourceId) return 'قلمرو مبدأ را برای جابجایی انتخاب کنید.';
    return 'قلمرو مقصد را انتخاب کنید.';
  })();

  const currentDiceId: number | null = (gameState as any).diceResult?.id ?? null;
  const showDiceModal = !!gameState.diceResult && currentDiceId !== dismissedDiceId;

  const updateStateAndSync = (newState: GameState) => {
    if (!socket.connected) {
      pushToast('ارتباط با سرور قطع است.', 'error');
      return;
    }
    const baseVersion = getVersion(gameState);
    const clonedState: any = JSON.parse(JSON.stringify(newState));
    clonedState.version = baseVersion + 1;
    setGameState(clonedState);
    socket.emit('update_game_state', { roomCode: currentRoomCode, newState: clonedState, baseVersion }, (res: any) => {
      if (res && !res.success) {
        if (res.state) applyServerState(res.state, true);
        if (res.message && !res.stale) pushToast(res.message, 'error');
      }
    });
  };

  const handleUndo = () => {
    if (!isMyTurn) return;
    if (gameState.phase === 'reinforce') {
      if (!gameState.reinforcementHistory || gameState.reinforcementHistory.length === 0) return;
      const history = [...gameState.reinforcementHistory];
      const lastAction = history.pop();
      if (!lastAction) return;

      const territory = gameState.territories[lastAction.territoryId];
      const updatedTerritories = {
        ...gameState.territories,
        [lastAction.territoryId]: { ...territory, armies: territory.armies - lastAction.armiesAdded }
      };

      const newState: GameState = {
        ...gameState,
        territories: updatedTerritories,
        reinforcementsRemaining: gameState.reinforcementsRemaining + lastAction.armiesAdded,
        reinforcementHistory: history,
      };
      updateStateAndSync(newState);
    } else if (gameState.phase === 'attack') {
      setAttackerReady(false);
      setDefenderReady(false);
      setSelectedDiceCount(3);
      socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'attacker', readyState: false });
      socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'defender', readyState: false });

      const newState: GameState = { ...gameState, selectedTerritoryId: null, attackTargetId: null };
      updateStateAndSync(newState);
    } else if (gameState.phase === 'fortify') {
      const newState: GameState = { ...gameState, selectedTerritoryId: null, fortifySourceId: null };
      updateStateAndSync(newState);
    }
  };

  const checkFortifyPath = (startId: string, targetId: string, ownerId: string): boolean => {
    if (startId === targetId) return false;
    const queue: string[] = [startId];
    const visited: Set<string> = new Set([startId]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === targetId) return true;

      const territoryData = TERRITORIES.find(t => t.id === currentId);
      if (territoryData) {
        let neighbors = [...territoryData.neighbors];
        if (currentId === 'japan' && !neighbors.includes('mongolia')) neighbors.push('mongolia');
        if (currentId === 'mongolia' && !neighbors.includes('japan')) neighbors.push('japan');

        for (const neighborId of neighbors) {
          const neighborTerritory = gameState.territories[neighborId];
          if (neighborTerritory && neighborTerritory.ownerId === ownerId && !visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }
    return false;
  };

  const handleTerritoryClick = (id: string) => {
    if (!isMyTurn || winner) return;
    const territory = gameState.territories[id];

    if (gameState.phase === 'reinforce') {
      if (territory.ownerId === activePlayer.id && gameState.reinforcementsRemaining > 0) {
        const updatedState: GameState = {
          ...gameState,
          territories: {
            ...gameState.territories,
            [id]: { ...territory, armies: territory.armies + 1 },
          },
          reinforcementsRemaining: gameState.reinforcementsRemaining - 1,
          reinforcementHistory: [...(gameState.reinforcementHistory || []), { territoryId: id, armiesAdded: 1 }],
        };
        updateStateAndSync(updatedState);
      }
    } else if (gameState.phase === 'attack') {
      if (!gameState.selectedTerritoryId) {
        if (territory.ownerId === activePlayer.id && territory.armies > 1) {
          const updatedState: GameState = { ...gameState, selectedTerritoryId: id };
          updateStateAndSync(updatedState);
        }
      } else if (gameState.selectedTerritoryId === id) {
        setAttackerReady(false);
        setDefenderReady(false);
        setSelectedDiceCount(3);
        socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'attacker', readyState: false });
        socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'defender', readyState: false });

        const clearedState: GameState = { ...gameState, selectedTerritoryId: null, attackTargetId: null };
        updateStateAndSync(clearedState);
      } else {
        const selected = TERRITORIES.find((t) => t.id === gameState.selectedTerritoryId);
        let selectedNeighbors = selected ? [...selected.neighbors] : [];
        if (gameState.selectedTerritoryId === 'japan') selectedNeighbors.push('mongolia');
        if (gameState.selectedTerritoryId === 'mongolia') selectedNeighbors.push('japan');

        if (selected && selectedNeighbors.includes(id) && territory.ownerId !== activePlayer.id) {
          setAttackerReady(false);
          setDefenderReady(false);
          setSelectedDiceCount(3);
          socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'attacker', readyState: false });
          socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'defender', readyState: false });

          const updatedState: GameState = { ...gameState, attackTargetId: id };
          updateStateAndSync(updatedState);
        }
      }
    } else if (gameState.phase === 'fortify') {
      if (!gameState.fortifySourceId) {
        if (territory.ownerId === activePlayer.id && territory.armies > 1) {
          const updatedState: GameState = { ...gameState, fortifySourceId: id };
          updateStateAndSync(updatedState);
        }
      } else if (gameState.fortifySourceId === id) {
        const updatedState: GameState = { ...gameState, fortifySourceId: null };
        updateStateAndSync(updatedState);
      } else {
        const sourceId = gameState.fortifySourceId;
        if (territory.ownerId === activePlayer.id) {
          if (checkFortifyPath(sourceId, id, activePlayer.id)) {
            setFortifyTargetId(id);
            setFortifyAmount(1);
            setShowFortifyModal(true);
          } else {
            pushToast('مسیر متصل وجود ندارد.', 'error');
          }
        }
      }
    }
  };

  const maxAllowedDice = attackerTerritory ? Math.min(attackerTerritory.armies - 1, 3) : 1;

  const handleToggleDiceReady = (roleIsAttacker: boolean) => {
    const currentReady = roleIsAttacker ? attackerReady : defenderReady;
    const nextReady = !currentReady;

    if (roleIsAttacker) setAttackerReady(nextReady);
    else setDefenderReady(nextReady);

    socket.emit('set_dice_status', {
      roomCode: currentRoomCode,
      role: roleIsAttacker ? 'attacker' : 'defender',
      readyState: nextReady,
      selectedDice: roleIsAttacker ? Math.min(selectedDiceCount, maxAllowedDice) : undefined,
    });
  };

  const executeFortifyTransfer = () => {
    if (!gameState.fortifySourceId || !fortifyTargetId) return;
    const sourceTerritory = gameState.territories[gameState.fortifySourceId];
    const targetTerritory = gameState.territories[fortifyTargetId];

    if (sourceTerritory && targetTerritory) {
      const transferCount = Math.max(1, Math.min(fortifyAmount, sourceTerritory.armies - 1));
      const updatedTerritories = {
        ...gameState.territories,
        [gameState.fortifySourceId]: { ...sourceTerritory, armies: sourceTerritory.armies - transferCount },
        [fortifyTargetId]: { ...targetTerritory, armies: targetTerritory.armies + transferCount }
      };

      const newState: GameState = { ...gameState, territories: updatedTerritories, fortifySourceId: null };
      updateStateAndSync(newState);
    }
    setShowFortifyModal(false);
    setFortifyTargetId(null);
  };

  const handleTradeCards = async (selectedCards: Card[], _bonusArmies: number) => {
    if (!isMyTurn || gameState.phase !== 'reinforce' || winner) return;
    if (!socket.connected) {
      pushToast('ارتباط قطع است.', 'error');
      return;
    }
    const res = await emitAck('trade_cards', { roomCode: currentRoomCode, cardIds: selectedCards.map((c) => c.id) }, 8000);
    if (res?.success) {
      pushToast(`🔄 مبادله انجام شد: +${res.bonus} سرباز`, 'success');
      setShowCardModal(false);
    } else {
      if (res?.state) applyServerState(res.state, true);
      pushToast(res?.message || 'خطا در مبادله.', 'error');
    }
  };

  const nextPhaseOrTurn = async () => {
    if (!isMyTurn || isAdvancing || winner) return;

    if (gameState.phase === 'attack' && (gameState.selectedTerritoryId || gameState.attackTargetId)) {
      pushToast('⚠️ ابتدا حمله را لغو کنید.', 'error');
      return;
    }

    if (gameState.phase === 'reinforce' && gameState.reinforcementsRemaining > 0) {
      pushToast('⚠️ هنوز سرباز برای قرار دادن دارید!', 'error');
      return;
    }

    if (!currentRoomCode || !socket.connected) {
      pushToast('ارتباط با سرور برقرار نیست.', 'error');
      return;
    }

    setIsAdvancing(true);
    const res = await emitAck('next_phase_or_turn', { roomCode: currentRoomCode }, 6000);
    setIsAdvancing(false);

    if (res?.timeout) {
      rejoinRoom();
      pushToast('سرور پاسخ نداد.', 'error');
      return;
    }
    if (res && !res.success) {
      if (res.state) applyServerState(res.state, true);
      if (res.message) pushToast(res.message, 'error');
    }
  };

  const formatTime = (t: number) => new Date(t).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-[#1a120b] text-amber-100 relative" dir="rtl">
      {overlays}

      <button onClick={() => setShowHelpModal(true)} className="fixed top-4 right-4 z-40 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer">❓ راهنما</button>

      <header className="w-full max-w-5xl flex flex-wrap justify-between items-center gap-3 mb-4 bg-[#2b1e16] p-4 rounded-xl border border-[#8c653d] shadow-md">
        <div>
          <h2 className="text-xl font-bold" style={{ color: activePlayer.color }}>
            نوبت: {activePlayer.name} {!isMyTurn && <span className="text-xs text-amber-400 font-normal">(در حال تماشا)</span>}
          </h2>
          <p className="text-xs text-amber-300 mt-1 flex items-center gap-2 flex-wrap">
            <span>بازیکن: <span className="text-white font-bold">{username}</span></span>
            <span>|</span>
            <button onClick={() => currentRoomCode && copyText(currentRoomCode, 'کد روم کپی شد')} className="hover:text-white cursor-pointer">
              روم: <span className="font-mono">{currentRoomCode}</span> 📋
            </button>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {PHASES.map((ph, i) => {
              const currentIdx = PHASES.findIndex((x) => x.id === gameState.phase);
              const status = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'todo';
              return (
                <React.Fragment key={ph.id}>
                  {i > 0 && <span className={`w-4 h-0.5 rounded ${i <= currentIdx ? 'bg-emerald-500' : 'bg-[#8c653d]/40'}`} />}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${status === 'current' ? 'bg-emerald-700 border-emerald-400 text-white' : status === 'done' ? 'bg-emerald-900/40 border-emerald-700/60 text-emerald-300/80' : 'bg-[#1a120b] border-[#8c653d]/40 text-amber-300/50'}`}>
                    <span>{status === 'done' ? '✔' : ph.icon}</span>
                    {ph.label}
                  </span>
                </React.Fragment>
              );
            })}
            {gameState.phase === 'reinforce' && (
              <span className="mr-2 text-[11px] font-bold text-amber-300">🪖 {gameState.reinforcementsRemaining} سرباز</span>
            )}
          </div>
          <p className="text-xs text-emerald-300/90 mt-2 leading-5 max-w-xl">{phaseHint}</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {isMyTurn && (
            <button onClick={handleUndo} className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 text-xs font-bold rounded-lg cursor-pointer text-white">↩️ لغو حرکت</button>
          )}
          <button onClick={() => setShowCardModal(true)} className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${isMyTurn && gameState.phase === 'reinforce' ? 'bg-amber-800 hover:bg-amber-700' : 'bg-[#3a2a1d] border border-[#8c653d]/60'}`}>
            🃏 کارت‌ها ({localPlayer.cards.length})
          </button>
          <button onClick={() => setShowMissionModal(true)} className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-xs font-bold rounded-lg cursor-pointer">📜 ماموریت</button>
          <button onClick={() => setShowLogPanel((v) => !v)} className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${showLogPanel ? 'bg-amber-600' : 'bg-[#3a2a1d]'} border border-[#8c653d]/60`}>🧾 گزارش</button>
          {isMyTurn && (
            <button onClick={nextPhaseOrTurn} disabled={isAdvancing} className={`px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-xs font-bold rounded-lg text-white shadow ${isAdvancing ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}>
              {isAdvancing ? 'در حال انتقال...' : 'مرحله بعد ➔'}
            </button>
          )}
          <button onClick={() => setShowLeaveModal(true)} className="px-3 py-2 bg-red-900/70 hover:bg-red-800 text-xs font-bold rounded-lg cursor-pointer text-red-100 border border-red-700/60">🚪 خروج</button>
        </div>
      </header>

      <section className="w-full max-w-5xl mb-4 flex flex-wrap gap-2">
        {gameState.players.map((p) => {
          const rp = playersList.find((x) => x.name === p.name);
          const meta = STATUS_META[rp?.status || 'online'] || STATUS_META.online;
          const owned = Object.values(gameState.territories).filter((t) => t.ownerId === p.id);
          const armies = owned.reduce((sum, t) => sum + t.armies, 0);
          const isActive = p.id === activePlayer.id;
          return (
            <div key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-xs ${isActive ? 'bg-[#3a2a1d] border-amber-400' : 'bg-[#2b1e16] border-[#8c653d]/60'} ${rp?.status === 'left' ? 'opacity-50' : ''}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
              <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: p.color }} />
              <span className="font-bold" style={{ color: p.color }}>{p.name}{p.name === username ? ' (شما)' : ''}</span>
              <span className="text-amber-300/80">🗺️ {owned.length}</span>
              <span className="text-amber-300/80">⚔️ {armies}</span>
              <span className="text-amber-300/80">🃏 {p.cards.length}</span>
            </div>
          );
        })}
      </section>

      {showLogPanel && (
        <section className="w-full max-w-5xl mb-4 bg-[#2b1e16] border border-[#8c653d] rounded-xl p-3 max-h-44 overflow-y-auto space-y-1">
          {logEntries.length === 0 && <p className="text-[11px] text-amber-300/70">هنوز رویدادی ثبت نشده است.</p>}
          {logEntries.slice().reverse().map((entry, i) => (
            <p key={`${entry.t}-${i}`} className="text-[11px] text-amber-100/90 flex gap-2">
              <span className="text-amber-400/60 font-mono shrink-0">{formatTime(entry.t)}</span>
              <span>{entry.text}</span>
            </p>
          ))}
        </section>
      )}

      {showFortifyModal && gameState.fortifySourceId && fortifyTargetId && (
        <FortifyModal sourceName={territoryName(gameState.fortifySourceId)} targetName={territoryName(fortifyTargetId)} sourceArmies={gameState.territories[gameState.fortifySourceId]?.armies ?? 1} targetArmies={gameState.territories[fortifyTargetId]?.armies ?? 0} amount={fortifyAmount} onChange={setFortifyAmount} onConfirm={executeFortifyTransfer} onCancel={() => setShowFortifyModal(false)} />
      )}

      {gameState.phase === 'attack' && gameState.selectedTerritoryId && gameState.attackTargetId && (
        <div className="w-full max-w-5xl mb-4 bg-red-950/90 border-2 border-red-600 p-4 rounded-xl flex flex-wrap gap-3 justify-between items-center shadow-lg">
          <span className="text-xs font-bold text-red-200">
            ⚔️ نبرد فعال بین {attackerPlayer?.name} و {defenderPlayer?.name}!
            {defenderLeft && ' (مدافع آفلاین است)'}
          </span>
          
          <div className="flex items-center gap-3">
            {/* انتخاب تعداد تاس مهاجم */}
            {isAttacker && (
              <div className="flex items-center gap-1.5 bg-[#1a120b] p-1.5 rounded-xl border border-red-800">
                <span className="text-[11px] text-amber-300 font-bold px-1">تاس:</span>
                {[1, 2, 3].map((num) => {
                  const isDisabled = num > maxAllowedDice || attackerReady;
                  return (
                    <button
                      key={num}
                      disabled={isDisabled}
                      onClick={() => setSelectedDiceCount(num)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${selectedDiceCount === num ? 'bg-amber-500 text-black scale-105 shadow' : isDisabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-red-900 text-white hover:bg-red-800'}`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              {isAttacker && (
                <button onClick={() => handleToggleDiceReady(true)} className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${attackerReady ? 'bg-green-600 text-white ring-2 ring-emerald-400' : 'bg-red-600 text-white hover:bg-red-500'}`}>
                  {attackerReady ? '✅ آماده' : 'پرتاب تاس مهاجم'}
                </button>
              )}
              {isDefender && (
                <button onClick={() => handleToggleDiceReady(false)} className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${defenderReady ? 'bg-green-600 text-white ring-2 ring-emerald-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                  {defenderReady ? '✅ آماده' : 'پرتاب تاس مدافع'}
                </button>
              )}
              {!isAttacker && !isDefender && (
                <span className="text-xs text-yellow-300 font-bold">
                  مهاجم ({selectedDiceCount} تاس): {attackerReady ? '✅' : '⏳'} | مدافع: {defenderReady ? '✅' : '⏳'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <Map state={gameState} onSelectTerritory={handleTerritoryClick} />

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      {showMissionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400">🎯 ماموریت محرمانه شما</h3>
            <p className="text-sm text-amber-100 bg-[#1a120b] p-4 rounded-xl border border-[#8c653d] leading-7">{localPlayer.mission}</p>
            {missionProgress && (
              <div className="text-right bg-[#1a120b] p-3 rounded-xl border border-[#8c653d]/60 space-y-2">
                <p className="text-[11px] font-bold text-amber-400">📈 پیشرفت شما</p>
                <p className="text-xs text-amber-100/90">{missionProgress.detail}</p>
              </div>
            )}
            <button onClick={() => setShowMissionModal(false)} className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl cursor-pointer font-bold text-xs">بستن</button>
          </div>
        </div>
      )}

      {showCardModal && (
        <CardModal cards={localPlayer.cards} isReinforcePhase={isMyTurn && gameState.phase === 'reinforce'} onTradeCards={handleTradeCards} onClose={() => setShowCardModal(false)} />
      )}

      {showDiceModal && gameState.diceResult && (
        <DiceModal attackerRolls={gameState.diceResult.attacker} defenderRolls={gameState.diceResult.defender} message={gameState.diceResult.message} onClose={() => setDismissedDiceId(currentDiceId ?? -1)} />
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b1e16] border-2 border-red-700 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-red-300">🚪 خروج از بازی</h3>
            <p className="text-xs text-amber-200 leading-6">با خروج، نوبت‌های شما رد می‌شود ولی می‌توانید دوباره به بازی برگردید.</p>
            <div className="flex gap-2">
              <button onClick={handleLeaveRoom} className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold text-xs cursor-pointer">خروج</button>
              <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-xs cursor-pointer">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {winner && !winnerDismissed && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#2b1e16] border-2 border-amber-400 p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="text-6xl">🏆</div>
            <h3 className="text-2xl font-black" style={{ color: winner.color }}>{winner.name}</h3>
            <p className="text-sm text-amber-200">برنده‌ی بازی شد!</p>
            <div className="flex gap-2">
              <button onClick={() => setWinnerDismissed(true)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-xs cursor-pointer">دیدن نقشه</button>
              <button onClick={handleLeaveRoom} className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded-xl font-bold text-xs cursor-pointer">خروج به لابی</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
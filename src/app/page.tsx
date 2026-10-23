'use client';

import React, { useState, useEffect } from 'react';
import { Map } from '@/components/Map';
import { DiceModal } from '@/components/DiceModal';
import { CardModal } from '@/components/CardModal';
import { HelpModal } from '@/components/HelpModal';
import { initializeGame } from '@/game/engine/setup';
import { GameState, Card } from '@/game/engine/state';
import { TERRITORIES } from '@/game/data/territories';
import { socket } from '@/game/socket';

export default function RiskGamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showMissionModal, setShowMissionModal] = useState<boolean>(false);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [showDiceModal, setShowDiceModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const [showFortifyModal, setShowFortifyModal] = useState<boolean>(false);
  const [fortifyTargetId, setFortifyTargetId] = useState<string | null>(null);
  const [fortifyAmount, setFortifyAmount] = useState<number>(1);

  const [inLobby, setInLobby] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [adminSecretInput, setAdminSecretInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [attackerReady, setAttackerReady] = useState<boolean>(false);
  const [defenderReady, setDefenderReady] = useState<boolean>(false);

  const getOrCreatePlayerId = () => {
    let pid = localStorage.getItem('risk_player_id');
    if (!pid) {
      pid = 'pid_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('risk_player_id', pid);
    }
    return pid;
  };

  const reinitializeSocketConnection = () => {
    if (!socket.connected) socket.connect();
    const savedUsername = localStorage.getItem('risk_username');
    const savedRoomCode = localStorage.getItem('risk_roomCode');
    const playerId = getOrCreatePlayerId();

    if (savedRoomCode && savedUsername) {
      socket.emit('join_room', { username: savedUsername, playerId, roomCode: savedRoomCode }, (response: any) => {
        if (response && response.success) {
          setPlayersList(response.players);
          if (response.gameState) {
            setGameState(response.gameState);
            setInLobby(false);
          }
        }
      });
    }
  };

  useEffect(() => {
    reinitializeSocketConnection();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reinitializeSocketConnection();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    socket.on('room_updated', ({ players }) => {
      setPlayersList(players);
      const pid = getOrCreatePlayerId();
      const savedUser = localStorage.getItem('risk_username');
      const me = players.find((p: any) => p.playerId === pid || p.name === savedUser);
      if (me) setIsHost(me.isHost);
    });

    socket.on('game_started', (initialState) => {
      setGameState(initialState);
      setAttackerReady(false);
      setDefenderReady(false);
      setInLobby(false);
    });

    socket.on('game_state_updated', (newState) => {
      setGameState(newState);
      if (!newState.attackTargetId || !newState.selectedTerritoryId) {
        setAttackerReady(false);
        setDefenderReady(false);
      }
      if (newState.diceResult) {
        setShowDiceModal(true);
      }
    });

    socket.on('dice_ready_updated', ({ attackerReady: aReady, defenderReady: dReady }) => {
      setAttackerReady(aReady);
      setDefenderReady(dReady);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('game_state_updated');
      socket.off('dice_ready_updated');
    };
  }, []);

  const handleCreateRoom = () => {
    setErrorMessage('');
    if (!username.trim() || !adminSecretInput.trim()) {
      setErrorMessage('لطفاً نام کاربری و رمز ادمین را وارد کنید.');
      return;
    }
    const playerId = getOrCreatePlayerId();
    setIsLoading(true);
    socket.emit('create_room', { username, playerId, maxPlayers: 5, adminSecret: adminSecretInput }, (response: any) => {
      setIsLoading(false);
      if (response && response.success) {
        setCurrentRoomCode(response.roomCode);
        setPlayersList(response.players);
        setIsHost(true);
        localStorage.setItem('risk_username', username);
        localStorage.setItem('risk_roomCode', response.roomCode);
      } else {
        setErrorMessage(response?.message || 'خطا در ساخت روم.');
      }
    });
  };

  const handleJoinRoom = () => {
    setErrorMessage('');
    if (!username.trim() || !roomCodeInput.trim()) {
      setErrorMessage('لطفاً نام کاربری و کد روم را وارد کنید.');
      return;
    }
    const playerId = getOrCreatePlayerId();
    setIsLoading(true);
    socket.emit('join_room', { username, playerId, roomCode: roomCodeInput.trim() }, (response: any) => {
      setIsLoading(false);
      if (response && response.success) {
        setCurrentRoomCode(response.roomCode);
        setPlayersList(response.players);
        const me = response.players.find((p: any) => p.playerId === playerId || p.name === username);
        if (me) setIsHost(me.isHost);
        localStorage.setItem('risk_username', username);
        localStorage.setItem('risk_roomCode', response.roomCode);
        if (response.gameState) {
          setGameState(response.gameState);
          setInLobby(false);
        }
      } else {
        setErrorMessage(response?.message || 'کد روم نامعتبر است.');
      }
    });
  };

  const handleRefreshPlayers = () => {
    if (currentRoomCode) {
      socket.emit('request_room_players', { roomCode: currentRoomCode });
    }
  };

  const handleStartOnlineGame = () => {
    if (playersList.length < 1) return;
    const initial = initializeGame(
      playersList.map((p) => ({ name: p.name, color: p.color, isAI: false }))
    );
    const activeP = initial.players[0];
    const myTerritoriesCount = Object.values(initial.territories).filter(t => t.ownerId === activeP.id).length;
    initial.reinforcementsRemaining = Math.max(3, Math.floor(myTerritoriesCount / 3));

    socket.emit('start_game', { roomCode: currentRoomCode, initialState: initial });
  };

  if (inLobby && !currentRoomCode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#1a120b] text-amber-100" dir="rtl">
        <div className="text-center space-y-6 max-w-md bg-[#2b1e16] p-8 rounded-3xl border-2 border-[#8c653d] shadow-2xl w-full">
          <h1 className="text-4xl font-black text-amber-400 font-serif">RISK GAME</h1>
          {errorMessage && <div className="bg-red-900 text-white text-xs p-3 rounded-xl">{errorMessage}</div>}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="نام کاربری شما..."
            className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-2.5 text-sm text-amber-100"
          />
          <div className="relative flex items-center w-full">
            <input
              type={showPassword ? "text" : "password"}
              value={adminSecretInput}
              onChange={(e) => setAdminSecretInput(e.target.value)}
              placeholder="رمز عبور ادمین..."
              className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-3 pl-12 text-xs text-amber-100 font-mono"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 text-amber-400 cursor-pointer">👁️</button>
          </div>
          <button onClick={handleCreateRoom} className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-sm rounded-xl text-white cursor-pointer">
            {isLoading ? 'در حال ساخت...' : '🛠️ ساخت روم جدید (ادمین)'}
          </button>
          <div className="pt-3 border-t border-[#8c653d]/40 space-y-2">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder="کد ۶ رقمی روم"
              className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-2.5 text-sm text-amber-100 text-center font-mono"
            />
            <button onClick={handleJoinRoom} className="w-full py-3 bg-blue-700 hover:bg-blue-600 font-bold text-sm rounded-xl text-white cursor-pointer">
              🔗 ورود به روم با کد
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (inLobby && currentRoomCode && !gameState) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#1a120b] text-amber-100" dir="rtl">
        <div className="text-center space-y-6 max-w-md bg-[#2b1e16] p-8 rounded-3xl border-2 border-amber-600 w-full shadow-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-amber-400">اتاق انتظار آنلاین</h2>
            <button onClick={handleRefreshPlayers} className="text-xs bg-amber-800 hover:bg-amber-700 text-amber-200 px-3 py-1 rounded-lg cursor-pointer">
              🔄 بروزرسانی لیست
            </button>
          </div>

          <p className="text-3xl font-mono font-extrabold text-emerald-400 tracking-widest">{currentRoomCode}</p>
          
          <div className="space-y-2 text-right bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]">
            <p className="text-xs font-bold text-amber-400 mb-2">بازیکنان حاضر در روم ({playersList.length} نفر):</p>
            {playersList.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs bg-[#2b1e16] p-2.5 rounded-lg border border-[#8c653d]/30">
                <span style={{ color: p.color }} className="font-bold">{p.name}</span>
                {p.isHost && <span className="bg-amber-600 text-white px-2 py-0.5 rounded text-[10px]">سازنده (Host)</span>}
              </div>
            ))}
          </div>

          {isHost ? (
            <button onClick={handleStartOnlineGame} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm rounded-xl text-white cursor-pointer shadow-lg">
              🚀 شروع بازی آنلاین برای همه ({playersList.length} نفر)
            </button>
          ) : (
            <p className="text-xs text-amber-400 animate-pulse py-3">منتظر بمانید تا سازنده روم بازی را شروع کند...</p>
          )}

          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[11px] text-red-400 hover:underline cursor-pointer pt-2">خروج از روم</button>
        </div>
      </main>
    );
  }

  if (!gameState) return <div className="text-white text-center mt-20 text-lg">در حال بارگذاری بازی...</div>;

  const localPlayer = gameState.players.find((p) => p.name === username) || gameState.players[0];
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer.name === username;

  const attackerTerritory = gameState.selectedTerritoryId ? gameState.territories[gameState.selectedTerritoryId] : null;
  const defenderTerritory = gameState.attackTargetId ? gameState.territories[gameState.attackTargetId] : null;

  const attackerPlayer = attackerTerritory ? gameState.players.find(p => p.id === attackerTerritory.ownerId) : null;
  const defenderPlayer = defenderTerritory ? gameState.players.find(p => p.id === defenderTerritory.ownerId) : null;

  const isAttacker = attackerPlayer?.name === username;
  const isDefender = defenderPlayer?.name === username;

  const updateStateAndSync = (newState: GameState) => {
    setGameState(newState);
    socket.emit('update_game_state', { roomCode: currentRoomCode, newState });
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
      socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'attacker', readyState: false });
      socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'defender', readyState: false });

      const newState: GameState = {
        ...gameState,
        selectedTerritoryId: null,
        attackTargetId: null,
      };
      updateStateAndSync(newState);
    } else if (gameState.phase === 'fortify') {
      const newState: GameState = {
        ...gameState,
        selectedTerritoryId: null,
        fortifySourceId: null,
      };
      updateStateAndSync(newState);
    }
  };

  // بررسی اتصال مسیر (BFS) با در نظر گرفتن ارتباط بین ژاپن و مغولستان به عنوان همسایه قانونی
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
        // اضافه کردن ارتباط کمکی بین ژاپن و مغولستان
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
    if (!isMyTurn) return;
    const territory = gameState.territories[id];
    let updatedState = { ...gameState };

    if (gameState.phase === 'reinforce') {
      if (territory.ownerId === activePlayer.id && gameState.reinforcementsRemaining > 0) {
        updatedState = {
          ...gameState,
          territories: { ...gameState.territories, [id]: { ...territory, armies: territory.armies + 1 } },
          reinforcementsRemaining: gameState.reinforcementsRemaining - 1,
          reinforcementHistory: [...(gameState.reinforcementHistory || []), { territoryId: id, armiesAdded: 1 }],
        };
        updateStateAndSync(updatedState);
      }
    } else if (gameState.phase === 'attack') {
      if (!gameState.selectedTerritoryId) {
        if (territory.ownerId === activePlayer.id && territory.armies > 1) {
          updatedState = { ...gameState, selectedTerritoryId: id };
          updateStateAndSync(updatedState);
        }
      } else if (gameState.selectedTerritoryId === id) {
        setAttackerReady(false);
        setDefenderReady(false);
        socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'attacker', readyState: false });
        socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'defender', readyState: false });

        const clearedState: GameState = { ...gameState, selectedTerritoryId: null, attackTargetId: null };
        updateStateAndSync(clearedState);
      } else {
        const selected = TERRITORIES.find((t) => t.id === gameState.selectedTerritoryId);
        let selectedNeighbors = selected ? [...selected.neighbors] : [];
        if (gameState.selectedTerritoryId === 'japan') selectedNeighbors.push('mongolia');
        if (gameState.selectedTerritoryId === 'mongolia') selectedNeighbors.push('japan');

        if (selected && (selectedNeighbors.includes(id)) && territory.ownerId !== activePlayer.id) {
          setAttackerReady(false);
          setDefenderReady(false);
          socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'attacker', readyState: false });
          socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'defender', readyState: false });

          updatedState = { ...gameState, attackTargetId: id };
          updateStateAndSync(updatedState);
        }
      }
    } else if (gameState.phase === 'fortify') {
      if (!gameState.fortifySourceId) {
        if (territory.ownerId === activePlayer.id && territory.armies > 1) {
          updatedState = { ...gameState, fortifySourceId: id };
          updateStateAndSync(updatedState);
        }
      } else if (gameState.fortifySourceId === id) {
        updatedState = { ...gameState, fortifySourceId: null };
        updateStateAndSync(updatedState);
      } else {
        const sourceId = gameState.fortifySourceId;
        if (territory.ownerId === activePlayer.id) {
          if (checkFortifyPath(sourceId, id, activePlayer.id)) {
            setFortifyTargetId(id);
            setFortifyAmount(1);
            setShowFortifyModal(true);
          } else {
            alert('قلمروهای انتخابی از طریق مسیرهای تحت کنترل شما به یکدیگر متصل نیستند.');
          }
        }
      }
    }
  };

  const handleToggleDiceReady = (roleIsAttacker: boolean) => {
    const currentReady = roleIsAttacker ? attackerReady : defenderReady;
    const nextReady = !currentReady;

    if (roleIsAttacker) setAttackerReady(nextReady);
    else setDefenderReady(nextReady);

    socket.emit('set_dice_status', {
      roomCode: currentRoomCode,
      role: roleIsAttacker ? 'attacker' : 'defender',
      readyState: nextReady,
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

      const newState: GameState = {
        ...gameState,
        territories: updatedTerritories,
        fortifySourceId: null,
      };
      updateStateAndSync(newState);
    }

    setShowFortifyModal(false);
    setFortifyTargetId(null);
  };

  const handleTradeCards = (selectedCards: Card[], bonusArmies: number) => {
    if (!isMyTurn || gameState.phase !== 'reinforce') return;

    const updatedPlayers = gameState.players.map((p, idx) => {
      if (idx === gameState.activePlayerIndex) {
        return { ...p, cards: p.cards.filter((c) => !selectedCards.some((sc) => sc.id === c.id)) };
      }
      return p;
    });

    const updatedState: GameState = {
      ...gameState,
      players: updatedPlayers,
      reinforcementsRemaining: gameState.reinforcementsRemaining + bonusArmies,
      cardTradeCount: gameState.cardTradeCount + 1,
    };
    updateStateAndSync(updatedState);
    setShowCardModal(false);
  };

  const nextPhaseOrTurn = () => {
    if (!isMyTurn) return;

    if (gameState.phase === 'attack' && (gameState.selectedTerritoryId || gameState.attackTargetId)) {
      alert('⚠️ ابتدا باید حمله انتخاب‌شده را لغو کنید و سپس به مرحله بعد بروید.');
      return;
    }

    let updatedState = { ...gameState };

    if (gameState.phase === 'reinforce') {
      if (gameState.reinforcementsRemaining > 0) return;
      updatedState.phase = 'attack';
    } else if (gameState.phase === 'attack') {
      updatedState.phase = 'fortify';
    } else {
      const nextIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;
      const nextPlayer = gameState.players[nextIndex];
      const nextTerritoriesCount = Object.values(gameState.territories).filter(t => t.ownerId === nextPlayer.id).length;
      const newReinforcements = Math.max(3, Math.floor(nextTerritoriesCount / 3));

      updatedState = {
        ...updatedState,
        phase: 'reinforce',
        activePlayerIndex: nextIndex,
        reinforcementsRemaining: newReinforcements,
        turnNumber: gameState.turnNumber + 1,
        selectedTerritoryId: null,
        attackTargetId: null,
        fortifySourceId: null,
        reinforcementHistory: [],
      };
    }

    setAttackerReady(false);
    setDefenderReady(false);
    socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'attacker', readyState: false });
    socket.emit('set_dice_status', { roomCode: currentRoomCode, role: 'defender', readyState: false });
    updateStateAndSync(updatedState);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-[#1a120b] text-amber-100 relative" dir="rtl">
      <button onClick={() => setShowHelpModal(true)} className="fixed top-4 right-4 z-40 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer">❓ راهنما</button>

      <header className="w-full max-w-5xl flex justify-between items-center mb-6 bg-[#2b1e16] p-4 rounded-xl border border-[#8c653d] shadow-md">
        <div>
          <h2 className="text-xl font-bold" style={{ color: activePlayer.color }}>
            نوبت: {activePlayer.name} {!isMyTurn && <span className="text-xs text-amber-400 font-normal">(در حال تماشا - نوبت شما نیست)</span>}
          </h2>
          <p className="text-xs text-amber-300 mt-1">
            بازیکن شما: <span className="text-white font-bold">{username}</span> | روم: {currentRoomCode}
          </p>
          <p className="text-xs text-emerald-400 font-bold mt-1">
            مرحله نوبت: {gameState.phase === 'reinforce' ? '۱. تقویت نیروها (گذاشتن سرباز)' : gameState.phase === 'attack' ? '۲. فاز حمله' : '۳. جابجایی نیروها'}
            {gameState.phase === 'reinforce' && ` | سرباز باقی‌مانده: ${gameState.reinforcementsRemaining}`}
            {gameState.phase === 'fortify' && gameState.fortifySourceId && ' | مبدأ انتخاب شد، قلمروی مقصد را انتخاب کنید'}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {isMyTurn && (
            <button onClick={handleUndo} className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 text-xs font-bold rounded-lg cursor-pointer text-white">
              ↩️ {gameState.phase === 'reinforce' ? 'بازگشت (Undo)' : gameState.phase === 'attack' ? 'لغو انتخاب حمله' : 'لغو جابجایی'}
            </button>
          )}

          <button 
            onClick={() => setShowCardModal(true)} 
            disabled={!isMyTurn || gameState.phase !== 'reinforce'}
            className={`px-3 py-2 text-xs font-bold rounded-lg ${
              isMyTurn && gameState.phase === 'reinforce' ? 'bg-amber-800 hover:bg-amber-700 cursor-pointer' : 'bg-gray-700 opacity-50 cursor-not-allowed'
            }`}
          >
            🃏 کارت‌ها ({localPlayer.cards.length})
          </button>

          <button onClick={() => setShowMissionModal(true)} className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-xs font-bold rounded-lg cursor-pointer">
            📜 ماموریت من
          </button>

          {isMyTurn && (
            <button onClick={nextPhaseOrTurn} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-xs font-bold rounded-lg text-white cursor-pointer shadow">
              مرحله بعد ➔
            </button>
          )}
        </div>
      </header>

      {showFortifyModal && gameState.fortifySourceId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400">📦 جابجایی نیروها</h3>
            <p className="text-xs text-amber-200">چندتا از نیروهای مبدأ را می‌خواهید جابجا کنید؟</p>
            <div className="flex items-center justify-center gap-4 my-4">
              <input 
                type="range" 
                min={1} 
                max={Math.max(1, (gameState.territories[gameState.fortifySourceId]?.armies || 2) - 1)} 
                value={fortifyAmount} 
                onChange={(e) => setFortifyAmount(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-xl font-bold font-mono text-emerald-400 bg-[#1a120b] px-4 py-1.5 rounded-xl border border-[#8c653d]">{fortifyAmount}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={executeFortifyTransfer} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer">تایید جابجایی</button>
              <button onClick={() => setShowFortifyModal(false)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-xs cursor-pointer">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {gameState.phase === 'attack' && gameState.selectedTerritoryId && gameState.attackTargetId && (
        <div className="w-full max-w-5xl mb-4 bg-red-950/90 border-2 border-red-600 p-4 rounded-xl flex justify-between items-center shadow-lg">
          <span className="text-xs font-bold text-red-200">⚔️ نبرد فعال بین {attackerPlayer?.name} و {defenderPlayer?.name}! هر دو باید تاس بزنند.</span>
          <div className="flex gap-2">
            {isAttacker && (
              <button
                onClick={() => handleToggleDiceReady(true)}
                className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  attackerReady ? 'bg-green-600 text-white shadow-inner scale-95 ring-2 ring-emerald-400' : 'bg-red-600 text-white hover:bg-red-500'
                }`}
              >
                پرتاب تاس مهاجم
              </button>
            )}
            {isDefender && (
              <button
                onClick={() => handleToggleDiceReady(false)}
                className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  defenderReady ? 'bg-green-600 text-white shadow-inner scale-95 ring-2 ring-emerald-400' : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                پرتاب تاس مدافع
              </button>
            )}
            {!isAttacker && !isDefender && (
              <span className="text-xs text-yellow-300 font-bold">
                مهاجم: {attackerReady ? '✅ تایید' : '⏳ منتظر'} | مدافع: {defenderReady ? '✅ تایید' : '⏳ منتظر'}
              </span>
            )}
          </div>
        </div>
      )}

      <Map state={gameState} onSelectTerritory={handleTerritoryClick} />

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      
      {showMissionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400">🎯 ماموریت محرمانه شما</h3>
            <p className="text-sm text-amber-100 bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]">{localPlayer.mission}</p>
            <button onClick={() => setShowMissionModal(false)} className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl cursor-pointer font-bold text-xs">بستن</button>
          </div>
        </div>
      )}

      {showCardModal && (
        <CardModal 
          cards={localPlayer.cards} 
          isReinforcePhase={isMyTurn && gameState.phase === 'reinforce'} 
          onTradeCards={handleTradeCards} 
          onClose={() => setShowCardModal(false)} 
        />
      )}

      {showDiceModal && gameState.diceResult && (
        <DiceModal 
          attackerRolls={gameState.diceResult.attacker} 
          defenderRolls={gameState.diceResult.defender} 
          message={gameState.diceResult.message} 
          onClose={() => { 
            setShowDiceModal(false); 
            const resetState = { ...gameState, diceResult: null };
            setGameState(resetState);
            socket.emit('update_game_state', { roomCode: currentRoomCode, newState: resetState });
          }} 
        />
      )}
    </main>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Map } from '@/components/Map';
import { DiceModal } from '@/components/DiceModal';
import { CardModal } from '@/components/CardModal';
import { HelpModal } from '@/components/HelpModal';
import { initializeGame } from '@/game/engine/setup';
import { calculateReinforcements } from '@/game/engine/reinforcements';
import { resolveCombat } from '@/game/engine/combat';
import { GameState, Card } from '@/game/engine/state';
import { TERRITORIES } from '@/game/data/territories';
import { socket } from '@/game/socket';

export default function RiskGamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showMissionModal, setShowMissionModal] = useState<boolean>(false);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [showDiceModal, setShowDiceModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

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

  // ثبت حمله موفق برای اعطای کارت در پایان نوبت
  const [hasConqueredThisTurn, setHasConqueredThisTurn] = useState<boolean>(false);

  // تایید دوطرفه تاس برای هر حمله
  const [attackerReadyForDice, setAttackerReadyForDice] = useState<boolean>(false);
  const [defenderReadyForDice, setDefenderReadyForDice] = useState<boolean>(false);

  const getOrCreatePlayerId = () => {
    let pid = localStorage.getItem('risk_player_id');
    if (!pid) {
      pid = 'pid_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('risk_player_id', pid);
    }
    return pid;
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const playerId = getOrCreatePlayerId();
    const savedUsername = localStorage.getItem('risk_username');
    const savedRoomCode = localStorage.getItem('risk_roomCode');

    if (savedUsername) setUsername(savedUsername);

    if (savedRoomCode && savedUsername) {
      setCurrentRoomCode(savedRoomCode);
      socket.emit('join_room', { username: savedUsername, playerId, roomCode: savedRoomCode }, (response: any) => {
        if (response && response.success) {
          setPlayersList(response.players);
          const me = response.players.find((p: any) => p.playerId === playerId);
          if (me) setIsHost(me.isHost);
          if (response.gameState) {
            setGameState(response.gameState);
            setInLobby(false);
          }
        } else {
          localStorage.removeItem('risk_roomCode');
          setCurrentRoomCode(null);
        }
      });
    }

    socket.on('room_updated', ({ players }) => {
      setPlayersList(players);
      const pid = getOrCreatePlayerId();
      const me = players.find((p: any) => p.playerId === pid);
      if (me) setIsHost(me.isHost);
    });

    socket.on('game_started', (initialState) => {
      setGameState(initialState);
      setInLobby(false);
    });

    socket.on('game_state_updated', (newState) => {
      setGameState(newState);
      if (newState.diceResult) {
        setShowDiceModal(true);
      }
    });

    return () => {
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('game_state_updated');
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
        const me = response.players.find((p: any) => p.playerId === playerId);
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
    // طبق قانون رسمی ریسک: حداقل ۳ سرباز در شروع نوبت
    initial.reinforcementsRemaining = Math.max(3, calculateReinforcements(initial, initial.players[0].id));
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
  // کنترل سخت‌گیرانه نوبت: فقط زمانی که نام کاربری ما با نام بازیکن فعال یکسان باشد اجازه اقدام داریم
  const isMyTurn = activePlayer.name === username;

  const updateStateAndSync = (newState: GameState) => {
    setGameState(newState);
    socket.emit('update_game_state', { roomCode: currentRoomCode, newState });
  };

  // قابلیت Undo (بازگشت آخرین سرباز گذاشته شده در فاز تقویت)
  const handleUndo = () => {
    if (!isMyTurn || gameState.phase !== 'reinforce') return;
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
  };

  // کلیک روی نقشه (کاملاً غیرفعال در خارج از نوبت کاربر)
  const handleTerritoryClick = (id: string) => {
    if (!isMyTurn) return; // قفل شدن سیستم در خارج از نوبت
    const territory = gameState.territories[id];
    let updatedState = { ...gameState };

    if (gameState.phase === 'reinforce') {
      if (territory.ownerId === activePlayer.id && gameState.reinforcementsRemaining > 0) {
        updatedState = {
          ...gameState,
          highlightedTerritoryId: id,
          territories: { ...gameState.territories, [id]: { ...territory, armies: territory.armies + 1 } },
          reinforcementsRemaining: gameState.reinforcementsRemaining - 1,
          reinforcementHistory: [...(gameState.reinforcementHistory || []), { territoryId: id, armiesAdded: 1 }],
        };
        updateStateAndSync(updatedState);
      }
    } else if (gameState.phase === 'attack') {
      if (!gameState.selectedTerritoryId) {
        if (territory.ownerId === activePlayer.id && territory.armies > 1) {
          updatedState = { ...gameState, selectedTerritoryId: id, highlightedTerritoryId: id };
          updateStateAndSync(updatedState);
        }
      } else if (gameState.selectedTerritoryId === id) {
        updatedState = { ...gameState, selectedTerritoryId: null, attackTargetId: null, highlightedTerritoryId: null };
        updateStateAndSync(updatedState);
      } else {
        const selected = TERRITORIES.find((t) => t.id === gameState.selectedTerritoryId);
        if (selected && selected.neighbors.includes(id) && territory.ownerId !== activePlayer.id) {
          updatedState = { ...gameState, attackTargetId: id, highlightedTerritoryId: id };
          updateStateAndSync(updatedState);
        }
      }
    }
  };

  // اجرای حمله دوطرفه تعاملی و ثبت فتح قلمرو برای اعطای کارت
  const handleExecuteCombat = () => {
    if (!gameState.selectedTerritoryId || !gameState.attackTargetId) return;
    const attacker = gameState.territories[gameState.selectedTerritoryId];
    const defender = gameState.territories[gameState.attackTargetId];

    const combatResult = resolveCombat(attacker.armies, defender.armies);
    const newAttackerArmies = attacker.armies - combatResult.attackerLosses;
    const newDefenderArmies = defender.armies - combatResult.defenderLosses;

    let newTerritories = { ...gameState.territories };
    let conquered = false;

    if (newDefenderArmies <= 0) {
      newTerritories[gameState.selectedTerritoryId] = { ...attacker, armies: newAttackerArmies - 1 };
      newTerritories[gameState.attackTargetId] = { id: defender.id, ownerId: attacker.ownerId, armies: 1 };
      conquered = true;
      setHasConqueredThisTurn(true); // ثبت فتح حداقل یک منطقه در این نوبت
    } else {
      newTerritories[gameState.selectedTerritoryId] = { ...attacker, armies: newAttackerArmies };
      newTerritories[gameState.attackTargetId] = { id: defender.id, ownerId: defender.ownerId, armies: newDefenderArmies };
    }

    const updatedState: GameState = {
      ...gameState,
      territories: newTerritories,
      diceResult: {
        attacker: combatResult.attackerRolls,
        defender: combatResult.defenderRolls,
        message: conquered ? '🎉 منطقه فتح شد!' : `تلفات مهاجم: ${combatResult.attackerLosses} | مدافع: ${combatResult.defenderLosses}`,
      },
    };

    setAttackerReadyForDice(false);
    setDefenderReadyForDice(false);
    updateStateAndSync(updatedState);
    setShowDiceModal(true);
  };

  // مبادله کارت‌ها فقط در مرحله اول نوبت (قبل از اتمام گذاشتن سربازها)
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

  // مدیریت تغییر مراحل ۳‌گانه نوبت و اعطای کارت در صورت فتح منطقه
  const nextPhaseOrTurn = () => {
    if (!isMyTurn) return;
    let updatedState = { ...gameState };

    if (gameState.phase === 'reinforce') {
      if (gameState.reinforcementsRemaining > 0) return;
      updatedState.phase = 'attack';
    } else if (gameState.phase === 'attack') {
      updatedState.phase = 'fortify';
    } else {
      // اعطای ۱ کارت جدید در پایان نوبت در صورت داشتن حداقل یک حمله موفق
      let updatedPlayers = [...gameState.players];
      if (hasConqueredThisTurn) {
        const deck = gameState.cardDeck || [];
        if (deck.length > 0) {
          const drawnCard = deck[0];
          const remainingDeck = deck.slice(1);
          updatedPlayers = updatedPlayers.map((p, idx) => {
            if (idx === gameState.activePlayerIndex) {
              return { ...p, cards: [...p.cards, drawnCard] };
            }
            return p;
          });
          updatedState.cardDeck = remainingDeck;
        }
      }

      const nextIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;
      const nextPlayerId = gameState.players[nextIndex].id;

      // محاسبه دقیق سربازهای اولیه طبق قانون رسمی (حداقل ۳ تا)
      const baseReinforcements = calculateReinforcements(gameState, nextPlayerId);
      const newReinforcements = Math.max(3, baseReinforcements);

      updatedState = {
        ...updatedState,
        players: updatedPlayers,
        phase: 'reinforce',
        activePlayerIndex: nextIndex,
        reinforcementsRemaining: newReinforcements,
        turnNumber: gameState.turnNumber + 1,
        selectedTerritoryId: null,
        attackTargetId: null,
        highlightedTerritoryId: null,
        reinforcementHistory: [],
      };

      setHasConqueredThisTurn(false); // ریست کردن وضعیت فتح برای نوبت بعدی
    }

    updateStateAndSync(updatedState);
  };

  const isDefender = gameState.attackTargetId && gameState.territories[gameState.attackTargetId]?.ownerId === localPlayer.id;
  const isAttacker = gameState.selectedTerritoryId && gameState.territories[gameState.selectedTerritoryId]?.ownerId === localPlayer.id;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-[#1a120b] text-amber-100 relative" dir="rtl">
      <button onClick={() => setShowHelpModal(true)} className="fixed top-4 right-4 z-40 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer">❓ راهنما</button>

      {/* هدر نمایش شفاف نوبت و ۳ مرحله بازی به سبک نسخه آفلاین */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-6 bg-[#2b1e16] p-4 rounded-xl border border-[#8c653d] shadow-md">
        <div>
          <h2 className="text-xl font-bold" style={{ color: activePlayer.color }}>
            نوبت: {activePlayer.name} {!isMyTurn && <span className="text-xs text-amber-400 font-normal">(در حال تماشا...)</span>}
          </h2>
          <p className="text-xs text-amber-300 mt-1">
            بازیکن شما: <span className="text-white font-bold">{username}</span> | دور: {gameState.turnNumber} | روم: {currentRoomCode}
          </p>
          <p className="text-xs text-emerald-400 font-bold mt-1">
            مرحله نوبت: {gameState.phase === 'reinforce' ? '۱. تقویت نیروها (گذاشتن سرباز)' : gameState.phase === 'attack' ? '۲. فاز حمله' : '۳. جابجایی استراتژیک'}
            {gameState.phase === 'reinforce' && ` | سرباز باقی‌مانده جهت جایگذاری: ${gameState.reinforcementsRemaining}`}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {/* دکمه بازگشت (Undo) برای سربازان فقط در مرحله اول و در نوبت خود کاربر فعال است */}
          {isMyTurn && gameState.phase === 'reinforce' && (
            <button onClick={handleUndo} className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 text-xs font-bold rounded-lg cursor-pointer text-white">
              ↩️ بازگشت (Undo)
            </button>
          )}

          {/* استفاده از کارت‌ها فقط در مرحله اول نوبت */}
          <button 
            onClick={() => setShowCardModal(true)} 
            className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${
              isMyTurn && gameState.phase === 'reinforce' ? 'bg-amber-800 hover:bg-amber-700' : 'bg-gray-700 opacity-60'
            }`}
          >
            🃏 کارت‌های من ({localPlayer.cards.length})
          </button>

          <button onClick={() => setShowMissionModal(true)} className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-xs font-bold rounded-lg cursor-pointer">
            📜 ماموریت من
          </button>

          {/* دکمه فاز بعد فقط در نوبت کاربر فعال است */}
          {isMyTurn && (
            <button onClick={nextPhaseOrTurn} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-xs font-bold rounded-lg text-white cursor-pointer shadow">
              پایان فاز / مرحله بعد ➔
            </button>
          )}
        </div>
      </header>

      {/* پنل تاس‌ریزی دوطرفه برای هر حمله */}
      {gameState.phase === 'attack' && gameState.selectedTerritoryId && gameState.attackTargetId && (
        <div className="w-full max-w-5xl mb-4 bg-red-950/90 border-2 border-red-600 p-4 rounded-xl flex justify-between items-center shadow-lg animate-pulse">
          <span className="text-xs font-bold text-red-200">⚔️ درخواست حمله فعال! هر دو بازیکن مهاجم و مدافع باید دکمه تاس را بزنند.</span>
          <div className="flex gap-2">
            {isAttacker && (
              <button
                onClick={() => {
                  const newReady = !attackerReadyForDice;
                  setAttackerReadyForDice(newReady);
                  if (newReady && defenderReadyForDice) handleExecuteCombat();
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer ${attackerReadyForDice ? 'bg-green-600 text-white' : 'bg-red-600 text-white hover:bg-red-500'}`}
              >
                {attackerReadyForDice ? '✅ تاس مهاجم آماده (تایید شد)' : '🎲 پرتاب تاس مهاجم'}
              </button>
            )}
            {isDefender && (
              <button
                onClick={() => {
                  const newReady = !defenderReadyForDice;
                  setDefenderReadyForDice(newReady);
                  if (newReady && attackerReadyForDice) handleExecuteCombat();
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer ${defenderReadyForDice ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
              >
                {defenderReadyForDice ? '✅ تاس مدافع آماده (تایید شد)' : '🛡️ پرتاب تاس مدافع'}
              </button>
            )}
            {!isAttacker && !isDefender && (
              <span className="text-xs text-yellow-300 font-bold">منتظر تایید تاس‌ریزی توسط مهاجم و مدافع...</span>
            )}
          </div>
        </div>
      )}

      {/* نقشه بازی به همراه هایلایت زنده اقدامات */}
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
          onClose={() => { setShowDiceModal(false); setGameState({ ...gameState, selectedTerritoryId: null, attackTargetId: null, highlightedTerritoryId: null }); }} 
        />
      )}
    </main>
  );
}
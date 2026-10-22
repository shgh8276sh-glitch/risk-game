'use client';

import React, { useState, useEffect } from 'react';
import { Map } from '@/components/Map';
import { DiceModal } from '@/components/DiceModal';
import { CardModal } from '@/components/CardModal';
import { HelpModal } from '@/components/HelpModal';
import { initializeGame } from '@/game/engine/setup';
import { calculateReinforcements } from '@/game/engine/reinforcements';
import { resolveCombat } from '@/game/engine/combat';
import { createCardDeck } from '@/game/engine/cards';
import { GameState, Card } from '@/game/engine/state';
import { TERRITORIES } from '@/game/data/territories';
import { socket } from '@/game/socket';

export default function RiskGamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [cardDeck, setCardDeck] = useState<Card[]>([]);
  const [showMissionModal, setShowMissionModal] = useState<boolean>(false);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [showDiceModal, setShowDiceModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const [inLobby, setInLobby] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('shahab');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [adminSecretInput, setAdminSecretInput] = useState<string>('');
  
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setErrorMessage('');
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('room_updated', ({ players }) => {
      setPlayersList(players);
    });

    socket.on('game_started', (initialState) => {
      setGameState(initialState);
      setInLobby(false);
    });

    socket.on('game_state_updated', (newState) => {
      setGameState(newState);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('game_state_updated');
    };
  }, []);

  const handleCreateRoom = () => {
    setErrorMessage('');

    if (!socket.connected) {
      setErrorMessage('⚠️ اتصال با سرور برقرار نیست! ابتدا دستور node server.js را اجرا کنید.');
      return;
    }

    if (!username.trim()) {
      setErrorMessage('لطفاً نام کاربری خود را وارد کنید.');
      return;
    }

    if (!adminSecretInput.trim()) {
      setErrorMessage('لطفاً رمز عبور ادمین را وارد کنید.');
      return;
    }

    setIsLoading(true);

    socket.emit('create_room', { username, maxPlayers: 5, adminSecret: adminSecretInput }, (response: any) => {
      setIsLoading(false);
      if (response && response.success) {
        setCurrentRoomCode(response.roomCode);
        setPlayersList(response.players);
        setIsHost(true);
        setErrorMessage('');
      } else {
        setErrorMessage(response?.message || 'رمز عبور ادمین اشتباه است (رمز صحیح: shahab123).');
      }
    });
  };

  const handleJoinRoom = () => {
    setErrorMessage('');

    if (!socket.connected) {
      setErrorMessage('⚠️ اتصال با سرور برقرار نیست!');
      return;
    }

    if (!username.trim() || !roomCodeInput.trim()) {
      setErrorMessage('لطفاً نام کاربری و کد ۶ رقمی روم را وارد کنید.');
      return;
    }

    setIsLoading(true);

    socket.emit('join_room', { username, roomCode: roomCodeInput }, (response: any) => {
      setIsLoading(false);
      if (response && response.success) {
        setCurrentRoomCode(response.roomCode);
        setPlayersList(response.players);
        setIsHost(false);
        setErrorMessage('');
      } else {
        setErrorMessage(response?.message || 'کد روم نامعتبر است یا ظرفیت پر شده است.');
      }
    });
  };

  const handleStartOnlineGame = () => {
    const initial = initializeGame(
      playersList.map((p) => ({ name: p.name, color: p.color, isAI: false }))
    );
    initial.reinforcementsRemaining = calculateReinforcements(initial, initial.players[0].id);

    setCardDeck(createCardDeck());
    socket.emit('start_game', { roomCode: currentRoomCode, initialState: initial });
  };

  if (inLobby && !currentRoomCode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-[#140c07] via-[#1a120b] to-[#0d0704] text-amber-100" dir="rtl">
        <div className="relative text-center space-y-6 max-w-md bg-[#2b1e16]/95 p-8 rounded-3xl border-2 border-[#8c653d] shadow-2xl backdrop-blur-md flex flex-col items-center w-full">
          
          <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[11px] bg-[#1a120b] px-3 py-1 rounded-full border border-[#8c653d]/50">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {isConnected ? 'سرور متصل' : 'سرور آفلاین'}
            </span>
          </div>

          <div className="relative mt-4 mb-2 select-none">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 via-red-600 to-amber-700 rounded-2xl blur-lg opacity-70 animate-pulse"></div>
            <div className="relative bg-[#1a120b] border-2 border-amber-500/80 px-10 py-3 rounded-2xl shadow-2xl flex items-center justify-center">
              <h1 className="text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 font-serif">
                RISK
              </h1>
            </div>
          </div>

          {errorMessage && (
            <div className="w-full bg-red-950/90 border-2 border-red-600 text-red-200 text-xs p-3 rounded-xl font-bold flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-white mr-2">✕</button>
            </div>
          )}

          <div className="w-full space-y-4 text-right">
            <div>
              <label className="text-xs text-amber-300 font-bold block mb-1">نام کاربری شما:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="نام کاربری..."
                className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-2.5 text-sm text-amber-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="pt-3 border-t border-[#8c653d]/40 space-y-2">
              <label className="text-xs text-amber-400 font-bold block">ساخت روم جدید (مخصوص شما):</label>
              
              {/* کادر ایمپوت پسوورد با کنترل مستقیم DOM و State برای عملکرد قطعی دکمه چشم */}
              <div className="relative flex items-center w-full">
                <input
                  key={showPassword ? 'text-input' : 'password-input'}
                  type={showPassword ? 'text' : 'password'}
                  defaultValue={adminSecretInput}
                  onChange={(e) => setAdminSecretInput(e.target.value)}
                  placeholder="رمز عبور ادمین..."
                  className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-3 pl-12 text-xs text-amber-100 focus:outline-none focus:border-amber-400 font-mono tracking-wider shadow-inner"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }}
                  className="absolute left-3 text-amber-400/80 hover:text-amber-200 transition focus:outline-none cursor-pointer p-1"
                  title={showPassword ? "مخفی کردن رمز" : "نمایش رمز"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.07 10.07 0 014.136-5.364m3.158-1.542A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 font-bold text-sm rounded-xl shadow-lg text-white transition cursor-pointer border border-amber-400/50 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="animate-spin">⏳ در حال ساخت...</span> : <span>🛠️ ساخت روم جدید و گرفتن کد</span>}
              </button>
            </div>

            <div className="pt-3 border-t border-[#8c653d]/40 space-y-2">
              <label className="text-xs text-amber-300 font-bold block">پیوستن به روم دوستان:</label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder="کد ۶ رقمی روم"
                className="w-full bg-[#1a120b] border border-[#8c653d] rounded-xl px-4 py-2.5 text-sm text-amber-100 focus:outline-none focus:border-blue-400 font-mono tracking-widest text-center"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isLoading}
                className="w-full py-3 bg-blue-700 hover:bg-blue-600 font-bold text-sm rounded-xl shadow-lg text-white transition cursor-pointer flex justify-center items-center gap-2"
              >
                <span>🔗 ورود به روم با کد</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[#8c653d]/40 w-full text-center">
            <span className="text-[11px] text-amber-400/60">
              تولیدکننده: <strong className="text-amber-300 font-bold">shahab</strong>
            </span>
          </div>

        </div>
      </main>
    );
  }

  if (inLobby && currentRoomCode && !gameState) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#1a120b] text-amber-100" dir="rtl">
        <div className="text-center space-y-6 max-w-md bg-[#2b1e16] p-8 rounded-3xl border-2 border-amber-600 shadow-2xl w-full">
          <h2 className="text-2xl font-bold text-amber-400">اتاق انتظار آنلاین</h2>
          
          <div className="bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]">
            <p className="text-xs text-amber-300">کد اختصاصی روم شما:</p>
            <p className="text-3xl font-mono font-extrabold text-emerald-400 tracking-widest my-1">{currentRoomCode}</p>
            <p className="text-[10px] text-amber-400/70">این کد را به دوستانتان بدهید تا وارد شوند.</p>
          </div>

          <div className="space-y-2 text-right">
            <h4 className="text-xs font-bold text-amber-300">بازیکنان حاضر در روم ({playersList.length}/5):</h4>
            <div className="bg-[#1a120b] p-3 rounded-xl border border-[#8c653d] space-y-1.5 max-h-40 overflow-y-auto">
              {playersList.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs bg-[#2b1e16] p-2 rounded-lg">
                  <span className="font-bold" style={{ color: p.color }}>{p.name}</span>
                  {p.isHost && <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded">سازنده (Host)</span>}
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={handleStartOnlineGame}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm rounded-xl shadow-lg text-white transition cursor-pointer"
            >
              🚀 شروع بازی آنلاین
            </button>
          ) : (
            <p className="text-xs text-amber-400/80 animate-pulse py-2">
              منتظر بمانید تا سازنده روم (شهاب) بازی را شروع کند...
            </p>
          )}
        </div>
      </main>
    );
  }

  const activePlayer = gameState!.players[gameState!.activePlayerIndex];

  const updateStateAndSync = (newState: GameState) => {
    setGameState(newState);
    socket.emit('update_game_state', { roomCode: currentRoomCode, newState });
  };

  const handleTerritoryClick = (id: string) => {
    if (!gameState) return;
    const activePlayer = gameState.players[gameState.activePlayerIndex];
    const territory = gameState.territories[id];
    let updatedState = { ...gameState };

    if (gameState.phase === 'reinforce') {
      if (territory.ownerId === activePlayer.id && gameState.reinforcementsRemaining > 0) {
        updatedState = {
          ...gameState,
          territories: { ...gameState.territories, [id]: { ...territory, armies: territory.armies + 1 } },
          reinforcementsRemaining: gameState.reinforcementsRemaining - 1,
          reinforcementHistory: [...gameState.reinforcementHistory, { territoryId: id, armiesAdded: 1 }],
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
        updatedState = { ...gameState, selectedTerritoryId: null, attackTargetId: null };
        updateStateAndSync(updatedState);
      } else {
        const selectedTerritory = TERRITORIES.find((t) => t.id === gameState.selectedTerritoryId);
        if (selectedTerritory && selectedTerritory.neighbors.includes(id) && territory.ownerId !== activePlayer.id) {
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
      } else if (territory.ownerId === activePlayer.id) {
        const source = gameState.territories[gameState.fortifySourceId];
        if (source.armies > 1) {
          updatedState = {
            ...gameState,
            territories: {
              ...gameState.territories,
              [source.id]: { ...source, armies: source.armies - 1 },
              [id]: { ...territory, armies: territory.armies + 1 },
            },
          };
          updateStateAndSync(updatedState);
        }
      }
    }
  };

  const handleUndoReinforcing = () => {
    if (!gameState || gameState.reinforcementHistory.length === 0) return;
    const lastAction = gameState.reinforcementHistory[gameState.reinforcementHistory.length - 1];
    const targetTerritory = gameState.territories[lastAction.territoryId];

    const updatedState = {
      ...gameState,
      territories: {
        ...gameState.territories,
        [lastAction.territoryId]: { ...targetTerritory, armies: targetTerritory.armies - 1 },
      },
      reinforcementsRemaining: gameState.reinforcementsRemaining + 1,
      reinforcementHistory: gameState.reinforcementHistory.slice(0, -1),
    };
    updateStateAndSync(updatedState);
  };

  const executeAttack = () => {
    if (!gameState || !gameState.selectedTerritoryId || !gameState.attackTargetId) return;
    const attacker = gameState.territories[gameState.selectedTerritoryId];
    const defender = gameState.territories[gameState.attackTargetId];

    const combatResult = resolveCombat(attacker.armies, defender.armies);
    const newAttackerArmies = attacker.armies - combatResult.attackerLosses;
    const newDefenderArmies = defender.armies - combatResult.defenderLosses;

    let newTerritories = { ...gameState.territories };
    let updatedPlayers = [...gameState.players];
    let updatedDeck = [...cardDeck];
    let cardEarnedMessage = '';

    if (newDefenderArmies <= 0) {
      newTerritories[gameState.selectedTerritoryId] = { ...attacker, armies: newAttackerArmies - 1 };
      newTerritories[gameState.attackTargetId] = { id: defender.id, ownerId: attacker.ownerId, armies: 1 };

      if (!gameState.conqueredTerritoryThisTurn && updatedDeck.length > 0) {
        const drawnCard = updatedDeck.pop()!;
        updatedPlayers[gameState.activePlayerIndex] = {
          ...updatedPlayers[gameState.activePlayerIndex],
          cards: [...updatedPlayers[gameState.activePlayerIndex].cards, drawnCard],
        };
        setCardDeck(updatedDeck);
        cardEarnedMessage = ` 🃏 کارت جایزه [${drawnCard.territoryId}] دریافت شد!`;
      }
    } else {
      newTerritories[gameState.selectedTerritoryId] = { ...attacker, armies: newAttackerArmies };
      newTerritories[gameState.attackTargetId] = { ...defender, armies: newDefenderArmies };
    }

    const updatedState = {
      ...gameState,
      territories: newTerritories,
      players: updatedPlayers,
      conqueredTerritoryThisTurn: newDefenderArmies <= 0 ? true : gameState.conqueredTerritoryThisTurn,
      diceResult: {
        attacker: combatResult.attackerRolls,
        defender: combatResult.defenderRolls,
        message: newDefenderArmies <= 0 ? `🎉 منطقه فتح شد!${cardEarnedMessage}` : `تلفات مهاجم: ${combatResult.attackerLosses}- | مدافع: ${combatResult.defenderLosses}-`,
      },
    };

    updateStateAndSync(updatedState);
    setShowDiceModal(true);
  };

  const handleTradeCards = (selectedCards: Card[], bonusArmies: number) => {
    if (!gameState) return;
    const updatedPlayers = gameState.players.map((p, idx) => {
      if (idx === gameState.activePlayerIndex) {
        return { ...p, cards: p.cards.filter((c) => !selectedCards.some((sc) => sc.id === c.id)) };
      }
      return p;
    });

    const updatedState = {
      ...gameState,
      players: updatedPlayers,
      reinforcementsRemaining: gameState.reinforcementsRemaining + bonusArmies,
      cardTradeCount: gameState.cardTradeCount + 1,
    };
    updateStateAndSync(updatedState);
    setShowCardModal(false);
  };

  const nextPhaseOrTurn = () => {
    if (!gameState) return;
    let updatedState = { ...gameState };

    if (gameState.phase === 'reinforce') {
      if (gameState.reinforcementsRemaining > 0) return;
      updatedState.phase = 'attack';
    } else if (gameState.phase === 'attack') {
      updatedState.phase = 'fortify';
      updatedState.selectedTerritoryId = null;
      updatedState.attackTargetId = null;
    } else if (gameState.phase === 'fortify') {
      const nextIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;
      const nextPlayerId = gameState.players[nextIndex].id;
      const newReinforcements = calculateReinforcements(gameState, nextPlayerId);

      updatedState = {
        ...gameState,
        phase: 'reinforce',
        activePlayerIndex: nextIndex,
        reinforcementsRemaining: newReinforcements,
        reinforcementHistory: [],
        conqueredTerritoryThisTurn: false,
        turnNumber: gameState.turnNumber + 1,
        selectedTerritoryId: null,
        attackTargetId: null,
        fortifySourceId: null,
        diceResult: null,
      };
    }
    updateStateAndSync(updatedState);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-[#1a120b] text-amber-100 relative" dir="rtl">
      
      <button
        onClick={() => setShowHelpModal(true)}
        className="fixed top-4 right-4 z-40 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-full border-2 border-amber-300 shadow-2xl flex items-center gap-1.5 text-xs font-bold transition transform hover:scale-105 cursor-pointer"
      >
        <span className="text-base">❓</span>
        <span>راهنمای بازی</span>
      </button>

      <div className="w-full max-w-5xl mb-4 bg-[#2b1e16] p-3 rounded-xl border border-[#8c653d] flex justify-between items-center text-xs font-bold">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${gameState.phase === 'reinforce' ? 'bg-amber-600 text-white shadow' : 'text-amber-400/50'}`}>
          <span>۱. پخش نیرو</span>
          {gameState.phase === 'reinforce' && <span>({gameState.reinforcementsRemaining} نیرو باقی‌مانده)</span>}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${gameState.phase === 'attack' ? 'bg-red-700 text-white shadow' : 'text-amber-400/50'}`}>
          <span>۲. فاز حمله</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${gameState.phase === 'fortify' ? 'bg-blue-700 text-white shadow' : 'text-amber-400/50'}`}>
          <span>۳. جابه‌جایی نیرو</span>
        </div>
      </div>

      <header className="w-full max-w-5xl flex justify-between items-center mb-6 bg-[#2b1e16] p-4 rounded-xl border border-[#8c653d] shadow-md">
        <div>
          <h2 className="text-xl font-bold" style={{ color: activePlayer.color }}>
            نوبت: {activePlayer.name}
          </h2>
          <p className="text-xs text-amber-300/60 mt-1">دور: {gameState.turnNumber} | روم: {currentRoomCode}</p>
        </div>

        <div className="flex items-center gap-2">
          {gameState.phase === 'reinforce' && (
            <button
              onClick={handleUndoReinforcing}
              disabled={gameState.reinforcementHistory.length === 0}
              className={`px-3 py-2 text-xs font-bold rounded-lg border transition ${
                gameState.reinforcementHistory.length > 0 ? 'bg-amber-900/80 border-amber-600 text-amber-200 cursor-pointer' : 'opacity-40 border-amber-950 text-amber-700 cursor-not-allowed'
              }`}
            >
              ↩️ لغو پخش
            </button>
          )}

          <button
            onClick={() => setShowCardModal(true)}
            className="px-3 py-2 bg-amber-800 hover:bg-amber-700 text-amber-100 text-xs font-bold rounded-lg border border-amber-600 cursor-pointer"
          >
            🃏 کارت‌های من ({activePlayer.cards.length})
          </button>

          <button
            onClick={() => setShowMissionModal(true)}
            className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-lg border border-amber-500 cursor-pointer"
          >
            📜 ماموریت
          </button>

          <button
            onClick={nextPhaseOrTurn}
            disabled={gameState.phase === 'reinforce' && gameState.reinforcementsRemaining > 0}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              gameState.phase === 'reinforce' && gameState.reinforcementsRemaining > 0 ? 'bg-amber-950 text-amber-700 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer'
            }`}
          >
            {gameState.phase === 'reinforce' ? 'رفتن به حمله' : gameState.phase === 'attack' ? 'رفتن به جابه‌جایی' : 'پایان نوبت'}
          </button>
        </div>
      </header>

      <Map state={gameState} onSelectTerritory={handleTerritoryClick} />

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      {showMissionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-4">
            <h3 className="text-lg font-bold text-amber-400">🎯 ماموریت مخفی شما</h3>
            <div className="bg-[#1a120b] p-4 rounded-xl border border-[#8c653d] text-amber-100 text-sm font-medium">{activePlayer.mission}</div>
            <button onClick={() => setShowMissionModal(false)} className="px-6 py-2 bg-amber-700 text-white font-bold rounded-xl cursor-pointer">بستن</button>
          </div>
        </div>
      )}
      {showCardModal && (
        <CardModal cards={activePlayer.cards} isReinforcePhase={gameState.phase === 'reinforce'} onTradeCards={handleTradeCards} onClose={() => setShowCardModal(false)} />
      )}
      {showDiceModal && gameState.diceResult && (
        <DiceModal attackerRolls={gameState.diceResult.attacker} defenderRolls={gameState.diceResult.defender} message={gameState.diceResult.message} onClose={() => { setShowDiceModal(false); setGameState({ ...gameState, selectedTerritoryId: null, attackTargetId: null }); }} />
      )}
    </main>
  );
}
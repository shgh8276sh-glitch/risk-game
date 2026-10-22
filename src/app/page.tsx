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
      // اگر در وضعیت حمله تایید شده باشد، مودال تاس برای همه باز می‌شود تا نتیجه عمومی را ببینند
      if (newState.diceResult) {
        setShowDiceModal(true);
      }
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
      setErrorMessage('⚠️ اتصال با سرور برقرار نیست!');
      return;
    }
    if (!username.trim() || !adminSecretInput.trim()) {
      setErrorMessage('لطفاً نام کاربری و رمز ادمین را وارد کنید.');
      return;
    }

    setIsLoading(true);
    socket.emit('create_room', { username, maxPlayers: 5, adminSecret: adminSecretInput }, (response: any) => {
      setIsLoading(false);
      if (response && response.success) {
        setCurrentRoomCode(response.roomCode);
        setPlayersList(response.players);
        setIsHost(true);
      } else {
        setErrorMessage(response?.message || 'رمز عبور اشتباه است.');
      }
    });
  };

  const handleJoinRoom = () => {
    setErrorMessage('');
    if (!username.trim() || !roomCodeInput.trim()) {
      setErrorMessage('لطفاً نام کاربری و کد روم را وارد کنید.');
      return;
    }

    setIsLoading(true);
    socket.emit('join_room', { username, roomCode: roomCodeInput }, (response: any) => {
      setIsLoading(false);
      if (response && response.success) {
        setCurrentRoomCode(response.roomCode);
        setPlayersList(response.players);
        setIsHost(false);
      } else {
        setErrorMessage(response?.message || 'کد روم نامعتبر است.');
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
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#1a120b] text-amber-100" dir="rtl">
        <div className="text-center space-y-6 max-w-md bg-[#2b1e16] p-8 rounded-3xl border-2 border-[#8c653d] shadow-2xl w-full">
          <h1 className="text-4xl font-black text-amber-400 font-serif">RISK</h1>
          {errorMessage && <div className="bg-red-900 text-white text-xs p-3 rounded-xl">{errorMessage}</div>}
          
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="نام کاربری..."
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
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 text-amber-400 cursor-pointer"
            >
              👁️
            </button>
          </div>

          <button onClick={handleCreateRoom} className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-sm rounded-xl text-white cursor-pointer">
            {isLoading ? 'در حال ساخت...' : '🛠️ ساخت روم جدید'}
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
        <div className="text-center space-y-6 max-w-md bg-[#2b1e16] p-8 rounded-3xl border-2 border-amber-600 w-full">
          <h2 className="text-2xl font-bold text-amber-400">اتاق انتظار آنلاین</h2>
          <p className="text-3xl font-mono font-extrabold text-emerald-400">{currentRoomCode}</p>
          
          <div className="space-y-2 text-right">
            {playersList.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs bg-[#1a120b] p-2 rounded-lg">
                <span style={{ color: p.color }}>{p.name}</span>
                {p.isHost && <span className="bg-amber-600 text-white px-2 py-0.5 rounded text-[10px]">Host</span>}
              </div>
            ))}
          </div>

          {isHost ? (
            <button onClick={handleStartOnlineGame} className="w-full py-3 bg-emerald-600 font-bold text-sm rounded-xl text-white cursor-pointer">
              🚀 شروع بازی آنلاین
            </button>
          ) : (
            <p className="text-xs text-amber-400 animate-pulse">منتظر شروع بازی توسط سازنده روم...</p>
          )}
        </div>
      </main>
    );
  }

  if (!gameState) return <div className="text-white text-center mt-20">در حال بارگذاری بازی...</div>;

  // پیدا کردن بازیکن فعلی این دستگاه بر اساس نام کاربری
  const localPlayer = gameState.players.find((p) => p.name === username) || gameState.players[0];
  const activePlayer = gameState.players[gameState.activePlayerIndex];

  const updateStateAndSync = (newState: GameState) => {
    setGameState(newState);
    socket.emit('update_game_state', { roomCode: currentRoomCode, newState });
  };

  const handleTerritoryClick = (id: string) => {
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
        const selected = TERRITORIES.find((t) => t.id === gameState.selectedTerritoryId);
        if (selected && selected.neighbors.includes(id) && territory.ownerId !== activePlayer.id) {
          updatedState = { ...gameState, attackTargetId: id };
          updateStateAndSync(updatedState);
        }
      }
    }
  };

  // تابع پرتاب تاس تعاملی (حمله بین دو بازیکن که نتیجه برای همه نمایش داده می‌شود)
  const executeInteractiveAttack = () => {
    if (!gameState.selectedTerritoryId || !gameState.attackTargetId) return;
    const attacker = gameState.territories[gameState.selectedTerritoryId];
    const defender = gameState.territories[gameState.attackTargetId];

    // محاسبه تاس و نتیجه نبرد به صورت عمومی
    const combatResult = resolveCombat(attacker.armies, defender.armies);
    const newAttackerArmies = attacker.armies - combatResult.attackerLosses;
    const newDefenderArmies = defender.armies - combatResult.defenderLosses;

    let newTerritories = { ...gameState.territories };
    if (newDefenderArmies <= 0) {
      newTerritories[gameState.selectedTerritoryId] = { ...attacker, armies: newAttackerArmies - 1 };
      newTerritories[gameState.attackTargetId] = { id: defender.id, ownerId: attacker.ownerId, armies: 1 };
    } else {
      newTerritories[gameState.selectedTerritoryId] = { ...attacker, armies: newAttackerArmies };
      newTerritories[gameState.attackTargetId] = { ...defender, armies: newDefenderArmies };
    }

    const updatedState: GameState = {
      ...gameState,
      territories: newTerritories,
      diceResult: {
        attacker: combatResult.attackerRolls,
        defender: combatResult.defenderRolls,
        message: newDefenderArmies <= 0 ? '🎉 منطقه فتح شد و مدافع شکست خورد!' : `تلفات مهاجم: ${combatResult.attackerLosses} | مدافع: ${combatResult.defenderLosses}`,
      },
    };

    updateStateAndSync(updatedState);
    setShowDiceModal(true); // نمایش نتیجه تاس برای همه کاربران آنلاین
  };

  const handleTradeCards = (selectedCards: Card[], bonusArmies: number) => {
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
    let updatedState = { ...gameState };
    if (gameState.phase === 'reinforce') {
      if (gameState.reinforcementsRemaining > 0) return;
      updatedState.phase = 'attack';
    } else if (gameState.phase === 'attack') {
      updatedState.phase = 'fortify';
    } else {
      const nextIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;
      const nextPlayerId = gameState.players[nextIndex].id;
      const newReinforcements = calculateReinforcements(gameState, nextPlayerId);

      updatedState = {
        ...gameState,
        phase: 'reinforce',
        activePlayerIndex: nextIndex,
        reinforcementsRemaining: newReinforcements,
        turnNumber: gameState.turnNumber + 1,
        selectedTerritoryId: null,
        attackTargetId: null,
      };
    }
    updateStateAndSync(updatedState);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-[#1a120b] text-amber-100 relative" dir="rtl">
      <button onClick={() => setShowHelpModal(true)} className="fixed top-4 right-4 z-40 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer">
        ❓ راهنما
      </button>

      <header className="w-full max-w-5xl flex justify-between items-center mb-6 bg-[#2b1e16] p-4 rounded-xl border border-[#8c653d]">
        <div>
          <h2 className="text-xl font-bold" style={{ color: activePlayer.color }}>نوبت: {activePlayer.name}</h2>
          <p className="text-xs text-amber-300/60">کاربر شما: {username} | دور: {gameState.turnNumber} | روم: {currentRoomCode}</p>
        </div>
        <div className="flex gap-2">
          {/* کارت‌ها فقط متعلق به بازیکنِ همان دستگاه است */}
          <button onClick={() => setShowCardModal(true)} className="px-3 py-2 bg-amber-800 hover:bg-amber-700 text-xs font-bold rounded-lg cursor-pointer">
            🃏 کارت‌های من ({localPlayer.cards.length})
          </button>
          {/* ماموریت فقط برای خود بازیکن قابل مشاهده است */}
          <button onClick={() => setShowMissionModal(true)} className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-xs font-bold rounded-lg cursor-pointer">
            📜 ماموریت من
          </button>
          <button onClick={nextPhaseOrTurn} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-xs font-bold rounded-lg text-white cursor-pointer">
            پایان فاز
          </button>
        </div>
      </header>

      {/* اگر فاز حمله است و مبدا و مقصد انتخاب شده، دکمه پرتاب تاس مشترک ظاهر می‌شود */}
      {gameState.phase === 'attack' && gameState.selectedTerritoryId && gameState.attackTargetId && (
        <div className="w-full max-w-5xl mb-4 bg-red-950/80 border-2 border-red-600 p-4 rounded-xl flex justify-between items-center animate-bounce">
          <span className="text-xs font-bold text-red-200">⚔️ هدف برای حمله انتخاب شد! هر دو بازیکن آماده‌ی پرتاب تاس هستند.</span>
          <button
            onClick={executeInteractiveAttack}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition"
          >
            🎲 پرتاب تاس و انجام حمله مشترک
          </button>
        </div>
      )}

      <Map state={gameState} onSelectTerritory={handleTerritoryClick} />

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      
      {/* مودال ماموریت خصوصی (فقط اطلاعات localPlayer را نشان می‌دهد) */}
      {showMissionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400">🎯 ماموریت محرمانه شما</h3>
            <p className="text-sm text-amber-100 bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]">{localPlayer.mission}</p>
            <button onClick={() => setShowMissionModal(false)} className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl cursor-pointer font-bold text-xs">بستن</button>
          </div>
        </div>
      )}

      {/* مودال کارت‌های خصوصی */}
      {showCardModal && (
        <CardModal cards={localPlayer.cards} isReinforcePhase={gameState.phase === 'reinforce'} onTradeCards={handleTradeCards} onClose={() => setShowCardModal(false)} />
      )}

      {/* مودال تاس عمومی (برای همه همزمان نمایش داده می‌شود تا نتایج نبرد را ببینند) */}
      {showDiceModal && gameState.diceResult && (
        <DiceModal attackerRolls={gameState.diceResult.attacker} defenderRolls={gameState.diceResult.defender} message={gameState.diceResult.message} onClose={() => { setShowDiceModal(false); setGameState({ ...gameState, selectedTerritoryId: null, attackTargetId: null }); }} />
      )}
    </main>
  );
}
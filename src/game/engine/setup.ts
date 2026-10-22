import { TERRITORIES } from '../data/territories';
import { MISSIONS } from '../data/missions';
import { GameState, Player, TerritoryState } from './state';

export function initializeGame(playerConfigs: { name: string; color: string; isAI: boolean }[]): GameState {
  const shuffledMissions = [...MISSIONS].sort(() => Math.random() - 0.5);

  const players: Player[] = playerConfigs.map((p, idx) => ({
    id: `player_${idx + 1}`,
    name: p.name,
    color: p.color,
    isAI: p.isAI,
    cards: [],
    mission: shuffledMissions[idx % shuffledMissions.length],
  }));

  const territoryStates: Record<string, TerritoryState> = {};
  
  // تقسیم ۱۰۰٪ تصادفی مناطق بین ۵ بازیکن
  const shuffledTerritories = [...TERRITORIES].sort(() => Math.random() - 0.5);

  shuffledTerritories.forEach((t, idx) => {
    const player = players[idx % players.length];
    territoryStates[t.id] = {
      id: t.id,
      ownerId: player.id,
      armies: 1,
    };
  });

  return {
    gameId: `game_${Date.now()}`,
    phase: 'reinforce',
    players,
    activePlayerIndex: 0,
    territories: territoryStates,
    reinforcementsRemaining: 4,
    reinforcementHistory: [],
    conqueredTerritoryThisTurn: false,
    cardTradeCount: 0,
    selectedTerritoryId: null,
    attackTargetId: null,
    fortifySourceId: null,
    diceResult: null,
    winner: null,
    turnNumber: 1,
  };
}
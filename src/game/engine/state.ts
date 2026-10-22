export type GamePhase = 'reinforce' | 'attack' | 'fortify' | 'victory';

export interface Card {
  id: string;
  territoryId: string;
  type: 'infantry' | 'cavalry' | 'artillery' | 'wild';
}

export interface Player {
  id: string;
  name: string;
  color: string;
  isAI: boolean;
  cards: Card[];
  mission: string;
}

export interface TerritoryState {
  id: string;
  ownerId: string | null;
  armies: number;
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: Player[];
  activePlayerIndex: number;
  territories: Record<string, TerritoryState>;
  reinforcementsRemaining: number;
  // برای ذخیره تاریخچه فاز پخش نیرو جهت Undo
  reinforcementHistory: Array<{ territoryId: string; armiesAdded: number }>;
  conqueredTerritoryThisTurn: boolean; // آیا در این نوبت فتحی داشته است؟
  cardTradeCount: number; // تعداد دفعات تعویض کارت جهت محاسبه بونس
  selectedTerritoryId: string | null;
  attackTargetId: string | null;
  fortifySourceId: string | null;
  diceResult: { attacker: number[]; defender: number[]; message: string } | null;
  winner: string | null;
  turnNumber: number;
}
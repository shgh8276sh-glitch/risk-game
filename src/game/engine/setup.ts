import { TERRITORIES } from '../data/territories';
import { MISSIONS } from '../data/missions';
import { GameState, Player, TerritoryState } from './state';

// رنگ هر ارتش در متن ماموریت‌ها (باید با رنگ‌های روم در server.js یکی باشد)
const MISSION_COLOR_WORDS: Record<string, string> = {
  'قرمز': '#dc2626',
  'آبی': '#2563eb',
  'سبز': '#16a34a',
  'زرد': '#eab308',
  'بنفش': '#9333ea',
};

// رنگ ارتشی که ماموریت می‌گوید نابود شود؛ اگر ماموریت از نوع «نابود کردن» نباشد null
function missionTargetColor(mission: string): string | null {
  const match = mission.match(/ارتش\s+(\S+)\s+را\s+نابود/);
  if (!match) return null;
  return MISSION_COLOR_WORDS[match[1]] ?? null;
}

// ماموریتِ «نابود کردن» فقط وقتی معنا دارد که آن ارتش در بازی باشد و ارتش خودِ بازیکن نباشد
function isMissionUsable(mission: string, ownColor: string, allColors: string[]): boolean {
  const target = missionTargetColor(mission);
  if (!target) return true;
  if (target === ownColor.toLowerCase()) return false;
  return allColors.some((c) => c.toLowerCase() === target);
}

export function initializeGame(playerConfigs: { name: string; color: string; isAI: boolean }[]): GameState {
  const shuffledMissions = [...MISSIONS].sort(() => Math.random() - 0.5);
  const allColors = playerConfigs.map((p) => p.color);
  const usedMissionIndexes = new Set<number>();

  const players: Player[] = playerConfigs.map((p, idx) => {
    // اولویت: ماموریتی که قابل‌اجرا و تکراری نیست؛ بعد هر ماموریتِ تکراری‌نشده؛ در نهایت چرخشی
    let pick = shuffledMissions.findIndex((m, i) => !usedMissionIndexes.has(i) && isMissionUsable(m, p.color, allColors));
    if (pick === -1) pick = shuffledMissions.findIndex((_, i) => !usedMissionIndexes.has(i));
    if (pick === -1) pick = idx % shuffledMissions.length;
    usedMissionIndexes.add(pick);

    return {
      id: `player_${idx + 1}`,
      name: p.name,
      color: p.color,
      isAI: p.isAI,
      cards: [],
      mission: shuffledMissions[pick],
    };
  });

  const territoryStates: Record<string, TerritoryState> = {};

  // تقسیم ۱۰۰٪ تصادفی مناطق بین بازیکنان
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

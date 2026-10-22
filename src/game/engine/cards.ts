import { Card } from './state';
import { TERRITORIES } from '../data/territories';

export function createCardDeck(): Card[] {
  const types: Array<'infantry' | 'cavalry' | 'artillery'> = ['infantry', 'cavalry', 'artillery'];
  const deck: Card[] = TERRITORIES.map((t, idx) => ({
    id: `card_${t.id}`,
    territoryId: t.id,
    type: types[idx % 3],
    stars: (idx % 2) + 1, // ۱ یا ۲ ستاره برای هر کارت
  }));

  deck.push({ id: 'wild_1', territoryId: 'wild', type: 'wild', stars: 2 });
  deck.push({ id: 'wild_2', territoryId: 'wild', type: 'wild', stars: 2 });

  return deck.sort(() => Math.random() - 0.5);
}

export function isValidCardSet(cards: Card[]): boolean {
  if (cards.length === 0 || cards.length > 3) return false;
  return true;
}

// محاسبه پاداش تعویض بر اساس نمادها (Insignia)
export function calculateSymbolBonus(cards: Card[]): number {
  if (cards.length !== 3) return 0;

  const types = cards.map((c) => c.type);
  const hasWild = types.includes('wild');

  if (types.every((t) => t === 'infantry')) return 4;
  if (types.every((t) => t === 'cavalry')) return 6;
  if (types.every((t) => t === 'artillery')) return 8;
  if (new Set(types).size === 3 || hasWild) return 10;

  return 0;
}

// محاسبه عمومی پاداش (ترکیب نمادها و ستاره‌ها)
export function calculateCardBonus(cards: Card[], tradeCount: number): number {
  if (cards.length === 0) return 0;

  // ۱. اگر ۳ کارت با ست معتبر باشد
  const symbolBonus = calculateSymbolBonus(cards);
  if (symbolBonus > 0) return symbolBonus;

  // ۲. محاسبه بر اساس ستاره‌ها
  const totalStars = cards.reduce((sum, c) => sum + (c.stars || 1), 0);
  const starBonuses: Record<number, number> = {
    1: 1,
    2: 2,
    3: 4,
    4: 7,
    5: 10,
    6: 13,
  };

  return starBonuses[totalStars] || totalStars * 2;
}
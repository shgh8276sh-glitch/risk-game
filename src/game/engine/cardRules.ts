import { Card } from './state';

// قوانین کارت طبق راهنمای بازی. سرور همین قوانین را اجرا می‌کند و این فایل فقط برای نمایش پیش‌نمایش در پنجره‌ی کارت‌هاست.
export const SYMBOL_BONUS = { infantry: 4, cavalry: 6, artillery: 8, different: 10 } as const;
export const STAR_BONUS: Record<number, number> = { 2: 2, 3: 4, 4: 7, 5: 10, 6: 13 };
export const MIN_CARDS_FOR_STARS = 2;
const TYPES: Card['type'][] = ['infantry', 'cavalry', 'artillery'];

export const CARD_SYMBOL: Record<Card['type'], { icon: string; label: string }> = {
  infantry: { icon: '🪖', label: 'پیاده' },
  cavalry: { icon: '🐎', label: 'سواره' },
  artillery: { icon: '💥', label: 'توپخانه' },
  wild: { icon: '🃏', label: 'جوکر' },
};

export interface CardSetResult {
  valid: boolean;
  bonus: number;
  method: 'symbols' | 'stars' | null;
}

// اگر هر دو روش ممکن باشد، پاداش بیشتر محاسبه می‌شود
export function evaluateCardSet(cards: Card[]): CardSetResult {
  let best: CardSetResult = { valid: false, bonus: 0, method: null };
  const consider = (bonus: number, method: 'symbols' | 'stars') => {
    if (!best.valid || bonus > best.bonus) best = { valid: true, bonus, method };
  };

  if (cards.length === 3) {
    const types = cards.map((c) => c.type);
    if (types.every((t) => t === types[0]) && types[0] !== 'wild') {
      consider(SYMBOL_BONUS[types[0] as 'infantry' | 'cavalry' | 'artillery'], 'symbols');
    } else if (TYPES.every((t) => types.includes(t))) {
      consider(SYMBOL_BONUS.different, 'symbols');
    }
  }

  if (cards.length >= MIN_CARDS_FOR_STARS && cards.length <= 3) {
    const stars = cards.reduce((sum, c) => sum + (c.stars || 1), 0);
    if (STAR_BONUS[stars]) consider(STAR_BONUS[stars], 'stars');
  }

  return best;
}

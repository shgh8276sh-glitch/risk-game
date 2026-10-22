import { Card } from './state';

export function createCardDeck(): Card[] {
  const territories = [
    'alaska', 'northwest_territory', 'greenland', 'alberta', 'ontario',
    'quebec', 'western_united_states', 'eastern_united_states', 'central_america',
    'venezuela', 'peru', 'brazil', 'argentina', 'iceland', 'great_britain',
    'western_europe', 'northern_europe', 'southern_europe', 'eastern_europe',
    'ukraine', 'north_africa', 'egypt', 'east_africa', 'congo', 'south_africa',
    'madagascar', 'ural', 'siberia', 'yakutsk', 'kamchatka', 'afghanistan',
    'china', 'india', 'southeast_asia', 'japan', 'middle_east', 'indonesia',
    'new_guinea', 'western_australia', 'eastern_australia'
  ];

  const types: ('infantry' | 'cavalry' | 'artillery')[] = ['infantry', 'cavalry', 'artillery'];
  let deck: Card[] = [];

  territories.forEach((territoryId, index) => {
    deck.push({
      id: `card_${index + 1}`,
      territoryId,
      type: types[index % 3],
    });
  });

  // افزودن کارت‌های وحشی (Wild)
  deck.push({ id: 'card_wild_1', territoryId: '', type: 'wild' });
  deck.push({ id: 'card_wild_2', territoryId: '', type: 'wild' });

  return deck;
}

// بررسی اینکه آیا کارت‌های انتخاب شده معتبر هستند یا خیر
export function isValidCardSet(cards: Card[]): boolean {
  if (cards.length !== 3) return false;

  const types = cards.map(c => c.type);
  const wilds = types.filter(t => t === 'wild').length;
  const nonWilds = types.filter(t => t !== 'wild');

  // ۳ کارت از یک شکل
  if (nonWilds.length === 3 && nonWilds[0] === nonWilds[1] && nonWilds[1] === nonWilds[2]) {
    return true;
  }

  // ۳ کارت با شکل‌های متفاوت
  if (nonWilds.length === 3 && new Set(nonWilds).size === 3) {
    return true;
  }

  // وجود کارت وایلد
  if (wilds > 0) {
    if (cards.length === 3) return true;
  }

  return false;
}

// محاسبه تعداد ارتش جایزه بر اساس تعداد دفعات مبادله کارت‌ها
export function calculateCardBonus(tradeCount: number): number {
  const bonuses = [4, 6, 8, 10, 12, 15];
  if (tradeCount < bonuses.length) {
    return bonuses[tradeCount];
  }
  // بعد از ششمین بار، هر بار ۵ ارتش اضافه می‌شود
  return 15 + (tradeCount - bonuses.length + 1) * 5;
}
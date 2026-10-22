export interface Card {
  id: string;
  territoryId: string;
  type: 'infantry' | 'cavalry' | 'artillery' | 'wild';
}

export function createCardDeck(): Card[] {
  // ساخت کارت‌ها بدون فیلد اضافی stars
  return [
    { id: 'c1', territoryId: 'alaska', type: 'infantry' },
    { id: 'c2', territoryId: 'northwest_territory', type: 'cavalry' },
    { id: 'c3', territoryId: 'greenland', type: 'artillery' },
    { id: 'c4', territoryId: 'alberta', type: 'infantry' },
    { id: 'c5', territoryId: 'ontario', type: 'cavalry' },
  ];
}
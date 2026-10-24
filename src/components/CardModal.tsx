import React, { useState } from 'react';
import { Card } from '../game/engine/state';
import { evaluateCardSet, CARD_SYMBOL } from '../game/engine/cardRules';
import { TERRITORIES } from '../game/data/territories';

interface CardModalProps {
  cards: Card[];
  isReinforcePhase: boolean;
  onTradeCards: (selectedCards: Card[], bonusArmies: number) => void;
  onClose: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ cards, isReinforcePhase, onTradeCards, onClose }) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const toggleSelectCard = (id: string) => {
    if (selectedCardIds.includes(id)) {
      setSelectedCardIds(selectedCardIds.filter((cardId) => cardId !== id));
    } else if (selectedCardIds.length < 3) {
      setSelectedCardIds([...selectedCardIds, id]);
    }
  };

  const selectedCardsList = cards.filter((c) => selectedCardIds.includes(c.id));
  const result = evaluateCardSet(selectedCardsList);

  const handleTrade = () => {
    if (!result.valid || !isReinforcePhase) return;
    onTradeCards(selectedCardsList, result.bonus);
    setSelectedCardIds([]);
  };

  const getTerritoryName = (territoryId: string) => {
    const territory = TERRITORIES.find((t) => t.id === territoryId);
    return territory ? territory.name : 'عمومی / وحشی';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-lg w-full text-center space-y-5 shadow-2xl">
        <h3 className="text-xl font-bold text-amber-400">🃏 کارت‌های شما</h3>

        {cards.length === 0 ? (
          <p className="text-xs text-amber-300/70 py-8 leading-6">
            هنوز کارتی ندارید. در هر نوبت که حداقل یک منطقه را فتح کنید، در پایان فاز حمله یک کارت می‌گیرید.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
            {cards.map((card) => {
              const isSelected = selectedCardIds.includes(card.id);
              const sym = CARD_SYMBOL[card.type] || CARD_SYMBOL.wild;
              const stars = card.stars || 1;
              return (
                <div
                  key={card.id}
                  onClick={() => toggleSelectCard(card.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition text-center space-y-1 ${
                    isSelected ? 'bg-amber-600/40 border-amber-400 scale-105' : 'bg-[#1a120b] border-[#8c653d] hover:border-amber-500'
                  }`}
                >
                  <div className="text-3xl leading-none">{sym.icon}</div>
                  <p className="text-xs font-bold text-amber-200">{sym.label}</p>
                  <p className="text-sm leading-none" aria-label={`${stars} ستاره`}>{'⭐'.repeat(stars)}</p>
                  <p className="text-[10px] text-amber-400/80 truncate">{getTerritoryName(card.territoryId)}</p>
                </div>
              );
            })}
          </div>
        )}

        {cards.length > 0 && (
          <div className="text-xs min-h-[2.5rem] flex items-center justify-center">
            {selectedCardsList.length === 0 ? (
              <span className="text-amber-300/70">۲ یا ۳ کارت انتخاب کنید تا پاداش مبادله را ببینید.</span>
            ) : result.valid ? (
              <span className="text-emerald-400 font-bold">
                پاداش: {result.bonus} سرباز {result.method === 'symbols' ? '(روش نمادها)' : '(روش مجموع ستاره‌ها)'}
              </span>
            ) : (
              <span className="text-red-300">این ترکیب طبق قوانین قابل مبادله نیست.</span>
            )}
          </div>
        )}

        {!isReinforcePhase && cards.length > 0 && (
          <p className="text-[11px] text-amber-300/70">مبادله‌ی کارت فقط در فاز تقویت و در نوبت خودتان ممکن است.</p>
        )}

        <div className="flex gap-3 pt-4 border-t border-[#8c653d]/40">
          {isReinforcePhase && (
            <button
              onClick={handleTrade}
              disabled={!result.valid}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition ${
                result.valid ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer' : 'bg-gray-700 opacity-50 cursor-not-allowed'
              }`}
            >
              🔄 مبادله‌ی کارت‌ها و دریافت ارتش
            </button>
          )}
          <button onClick={onClose} className="px-6 py-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer">
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};

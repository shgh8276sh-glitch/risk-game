import React, { useState } from 'react';
import { Card } from '../game/engine/state';
import { isValidCardSet, calculateCardBonus } from '../game/engine/cards';
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
    } else {
      if (selectedCardIds.length < 3) {
        setSelectedCardIds([...selectedCardIds, id]);
      }
    }
  };

  const selectedCardsList = cards.filter((c) => selectedCardIds.includes(c.id));
  const isValidSet = isValidCardSet(selectedCardsList);

  const handleTrade = () => {
    if (!isValidSet) return;
    // اصلاح تابع به طوری که فقط یک آرگومان (تعداد دفعات مبادله) را دریافت کند
    const bonus = calculateCardBonus(0); 
    onTradeCards(selectedCardsList, bonus);
  };

  const getTerritoryName = (territoryId: string) => {
    const territory = TERRITORIES.find((t) => t.id === territoryId);
    return territory ? territory.name : 'عمومی / وحشی';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-lg w-full text-center space-y-6 shadow-2xl">
        <h3 className="text-xl font-bold text-amber-400">🃏 کارت‌های شما</h3>

        {cards.length === 0 ? (
          <p className="text-xs text-amber-300/70 py-8">شما هنوز هیچ کارتی دریافت نکرده‌اید.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
            {cards.map((card) => {
              const isSelected = selectedCardIds.includes(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => toggleSelectCard(card.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition text-right space-y-1 ${
                    isSelected ? 'bg-amber-600/40 border-amber-400 scale-105' : 'bg-[#1a120b] border-[#8c653d]'
                  }`}
                >
                  <p className="text-xs font-bold text-amber-200 capitalize">{card.type}</p>
                  <p className="text-[10px] text-amber-400/80 truncate">{getTerritoryName(card.territoryId)}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-[#8c653d]/40">
          {isReinforcePhase && (
            <button
              onClick={handleTrade}
              disabled={!isValidSet}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition ${
                isValidSet ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer' : 'bg-gray-700 opacity-50 cursor-not-allowed'
              }`}
            >
              🔄 مبادله کارت‌ها و دریافت ارتش
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
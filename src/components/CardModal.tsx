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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const selectedCards = cards.filter((c) => selectedIds.includes(c.id));
  const canTrade = isValidCardSet(selectedCards);
  const bonusArmies = calculateCardBonus(selectedCards, 0);

  const getCardIcon = (type: Card['type']) => {
    switch (type) {
      case 'infantry': return '🪖 پیاده‌نظام';
      case 'cavalry': return '🐎 سواره‌نظام';
      case 'artillery': return '💥 توپخانه';
      case 'wild': return '⭐ کارت جوکر (Wild)';
    }
  };

  const getTerritoryName = (territoryId: string) => {
    const t = TERRITORIES.find((item) => item.id === territoryId);
    return t ? t.name : 'کارت ویژه';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-[#2b1e16] border-2 border-[#8c653d] p-6 rounded-2xl max-w-xl w-full shadow-2xl text-amber-100">
        <div className="flex justify-between items-center mb-4 border-b border-[#8c653d] pb-3">
          <h3 className="text-xl font-bold text-amber-400">🃏 مدیریت و سوزاندن کارت‌ها</h3>
          <span className="text-xs bg-amber-900/60 text-amber-300 px-3 py-1 rounded-full border border-amber-700">
            تعداد کارت‌های شما: {cards.length}
          </span>
        </div>

        {!isReinforcePhase && (
          <p className="text-xs text-amber-400 bg-amber-950/80 p-2 rounded-lg border border-amber-800 mb-3 text-center">
            ⚠️ تعویض و دریافت سرباز فقط در فاز ۱ (تقویت نیرو) امکان‌پذیر است.
          </p>
        )}

        {cards.length === 0 ? (
          <p className="text-center py-8 text-amber-300/60 italic">شما هنوز کارتی ندارید. با فتح حداقل ۱ قلمرو در نوبت خود کارت دریافت کنید!</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 my-4 max-h-60 overflow-y-auto p-1">
            {cards.map((card) => {
              const isSelected = selectedIds.includes(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => toggleSelect(card.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col items-center justify-between text-center min-h-[110px] ${
                    isSelected
                      ? 'bg-amber-700/80 border-amber-300 scale-105 shadow-lg'
                      : 'bg-amber-900/40 border-amber-800/80 hover:border-amber-600'
                  }`}
                >
                  <span className="text-xs font-bold text-amber-200">{getTerritoryName(card.territoryId)}</span>
                  <span className="text-xs my-1 font-semibold">{getCardIcon(card.type)}</span>
                  <span className="text-[10px] text-amber-400">⭐ {card.stars || 1} ستاره</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t border-[#8c653d]">
          <div>
            {canTrade && selectedCards.length > 0 && (
              <p className="text-xs text-emerald-400 font-bold">
                پاداش کارت‌های انتخابی: +{bonusArmies} سرباز اضافه
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onTradeCards(selectedCards, bonusArmies)}
              disabled={!canTrade || !isReinforcePhase || selectedCards.length === 0}
              className={`px-4 py-2.5 rounded-xl font-bold transition text-xs ${
                canTrade && isReinforcePhase && selectedCards.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer'
                  : 'bg-amber-950/60 text-amber-700 border border-amber-900 cursor-not-allowed'
              }`}
            >
              سوزاندن کارت‌ها و دریافت سرباز
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-amber-900/80 hover:bg-amber-800 text-amber-200 font-semibold text-xs rounded-xl border border-amber-700 cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
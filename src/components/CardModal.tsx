import React, { useState } from 'react';
import { Card } from '../game/engine/state';
import { evaluateCardSet, SYMBOL_BONUS, STAR_BONUS } from '../game/engine/cardRules';
import { TERRITORIES } from '../game/data/territories';
import { CardSymbol, Stars, SYMBOL_LABEL, SymbolType } from './CardSymbol';

interface CardModalProps {
  cards: Card[];
  isReinforcePhase: boolean;
  onTradeCards: (selectedCards: Card[], bonusArmies: number) => void;
  onClose: () => void;
}

const TYPE_FRAME: Record<SymbolType, string> = {
  infantry: 'from-[#2c4020]/60 to-[#1a120b]',
  cavalry: 'from-[#6b4423]/60 to-[#1a120b]',
  artillery: 'from-[#2b333b]/80 to-[#1a120b]',
  wild: 'from-[#4c1d95]/60 to-[#1a120b]',
};

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
  const totalStars = selectedCardsList.reduce((sum, c) => sum + (c.stars || 1), 0);

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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" dir="rtl" onClick={onClose}>
      <div
        className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-lg w-full text-center space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-amber-400">🃏 کارت‌های شما ({cards.length})</h3>

        {cards.length === 0 ? (
          <p className="text-xs text-amber-300/70 py-8 leading-6">
            هنوز کارتی ندارید. در هر نوبت که حداقل یک منطقه را فتح کنید، در پایان فاز حمله یک کارت می‌گیرید.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2">
            {cards.map((card) => {
              const isSelected = selectedCardIds.includes(card.id);
              const type = (card.type as SymbolType) || 'wild';
              const stars = card.stars || 1;
              return (
                <button
                  type="button"
                  key={card.id}
                  onClick={() => toggleSelectCard(card.id)}
                  aria-pressed={isSelected}
                  className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all bg-gradient-to-b ${TYPE_FRAME[type]} flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'border-amber-400 scale-105 shadow-[0_0_14px_rgba(251,191,36,0.45)]'
                      : 'border-[#8c653d] hover:border-amber-500'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-amber-400 text-[#1a120b] text-[11px] font-black flex items-center justify-center">
                      {selectedCardIds.indexOf(card.id) + 1}
                    </span>
                  )}
                  <CardSymbol type={type} size={52} />
                  <span className="text-xs font-bold text-amber-200">{SYMBOL_LABEL[type]}</span>
                  <Stars count={stars} size={14} />
                  <span className="text-[10px] text-amber-400/80 truncate max-w-full">{getTerritoryName(card.territoryId)}</span>
                </button>
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
                پاداش: {result.bonus} سرباز {result.method === 'symbols' ? '(روش نمادها)' : `(روش ستاره‌ها: مجموع ${totalStars} ستاره)`}
              </span>
            ) : (
              <span className="text-red-300">
                این ترکیب طبق قوانین قابل مبادله نیست{selectedCardsList.length < 2 ? ' (حداقل ۲ کارت لازم است)' : ''}.
              </span>
            )}
          </div>
        )}

        {!isReinforcePhase && cards.length > 0 && (
          <p className="text-[11px] text-amber-300/70">مبادله‌ی کارت فقط در فاز تقویت و در نوبت خودتان ممکن است.</p>
        )}

        {/* راهنمای سریع پاداش‌ها */}
        <div className="text-right bg-[#1a120b] border border-[#8c653d]/60 rounded-xl p-3 space-y-2">
          <p className="text-[11px] font-bold text-amber-400">روش ۱: ۳ کارت با نماد</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-100/90 items-center">
            {(['infantry', 'cavalry', 'artillery'] as const).map((t) => (
              <span key={t} className="inline-flex items-center gap-1">
                <CardSymbol type={t} size={18} />×۳ = <b className="text-emerald-400">{SYMBOL_BONUS[t]}</b>
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <CardSymbol type="infantry" size={16} />
              <CardSymbol type="cavalry" size={16} />
              <CardSymbol type="artillery" size={16} /> = <b className="text-emerald-400">{SYMBOL_BONUS.different}</b>
            </span>
          </div>
          <p className="text-[11px] font-bold text-amber-400 pt-1">روش ۲: مجموع ستاره‌ها (۲ یا ۳ کارت)</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-amber-100/90 items-center">
            {Object.entries(STAR_BONUS).map(([stars, bonus]) => (
              <span key={stars} className="inline-flex items-center gap-1">
                {stars}
                <Stars count={1} size={12} /> = <b className="text-emerald-400">{bonus}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-[#8c653d]/40">
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

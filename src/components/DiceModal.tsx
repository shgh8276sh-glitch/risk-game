'use client';

import React from 'react';

interface DiceModalProps {
  attackerRolls: number[];
  defenderRolls: number[];
  message: string;
  attackerName?: string;
  defenderName?: string;
  onClose: () => void;
}

export const DiceModal: React.FC<DiceModalProps> = ({
  attackerRolls,
  defenderRolls,
  message,
  attackerName = 'مهاجم',
  defenderName = 'مدافع',
  onClose,
}) => {
  // الگوی نقاط تاس (1 تا 6)
  const renderDiceDots = (value: number, isAttacker: boolean) => {
    const dotColor = isAttacker ? 'bg-white' : 'bg-gray-900';
    
    const dotsMap: Record<number, string[]> = {
      1: ['col-start-2 row-start-2'],
      2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
      3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
      4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
      5: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-2 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
      6: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-2', 'col-start-3 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    };

    const positions = dotsMap[value] || [];

    return (
      <div className="grid grid-cols-3 grid-rows-3 w-10 h-10 p-1.5 gap-0.5">
        {positions.map((pos, idx) => (
          <span key={idx} className={`w-2 h-2 rounded-full ${dotColor} ${pos}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" dir="rtl">
      <div className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-md w-full text-center space-y-5 shadow-2xl animate-fade-in">
        <h3 className="text-xl font-black text-amber-400 flex items-center justify-center gap-2">
          <span>🎲</span> نتيجه‌ی نبرد
        </h3>

        <div className="grid grid-cols-2 gap-4 bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]">
          {/* بخش مهاجم (قرمز ثابت) */}
          <div className="flex flex-col items-center gap-2 border-l border-[#8c653d]/40 pl-2">
            <span className="text-xs font-bold text-red-400 flex items-center gap-1">
              🔴 مهاجم ({attackerName})
            </span>
            <div className="flex flex-wrap justify-center gap-2 min-h-[50px] items-center">
              {attackerRolls.map((val, idx) => (
                <div key={idx} className="bg-red-600 rounded-xl shadow-lg border-2 border-red-400 flex items-center justify-center">
                  {renderDiceDots(val, true)}
                </div>
              ))}
            </div>
          </div>

          {/* بخش مدافع (سفید/خاکستری ثابت) */}
          <div className="flex flex-col items-center gap-2 pr-2">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-1">
              ⚪ مدافع ({defenderName})
            </span>
            <div className="flex flex-wrap justify-center gap-2 min-h-[50px] items-center">
              {defenderRolls.map((val, idx) => (
                <div key={idx} className="bg-gray-100 rounded-xl shadow-lg border-2 border-gray-400 flex items-center justify-center">
                  {renderDiceDots(val, false)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm font-bold text-emerald-300 bg-[#1a120b] py-2 px-3 rounded-lg border border-emerald-800/50">
          {message}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-sm text-white rounded-xl shadow-lg cursor-pointer transition-all active:scale-95"
        >
          ادامه
        </button>
      </div>
    </div>
  );
};
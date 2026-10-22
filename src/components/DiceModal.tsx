import React, { useEffect, useState } from 'react';

interface DiceModalProps {
  attackerRolls: number[];
  defenderRolls: number[];
  message: string;
  onClose: () => void;
}

const DiceFace = ({ value, color, isRolling }: { value: number; color: 'red' | 'blue'; isRolling: boolean }) => {
  const dotPositions: Record<number, string[]> = {
    1: ['col-start-2 row-start-2'],
    2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
    3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
    4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    5: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-2 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    6: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-2', 'col-start-3 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
  };

  const bgClass = color === 'red'
    ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-800 border-red-300 shadow-red-900/80'
    : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 border-blue-300 shadow-blue-900/80';

  return (
    <div
      className={`w-16 h-16 rounded-2xl border-2 p-2.5 grid grid-cols-3 grid-rows-3 gap-1 shadow-2xl transition-all ${bgClass} ${
        isRolling ? 'animate-spin scale-110 rotate-180' : 'scale-100'
      }`}
    >
      {dotPositions[value]?.map((posClass, idx) => (
        <div key={idx} className={`w-2.5 h-2.5 bg-white rounded-full shadow-inner ${posClass}`} />
      ))}
    </div>
  );
};

export const DiceModal: React.FC<DiceModalProps> = ({ attackerRolls, defenderRolls, message, onClose }) => {
  const [isRolling, setIsRolling] = useState(true);
  const [tempAttacker, setTempAttacker] = useState<number[]>(attackerRolls);
  const [tempDefender, setTempDefender] = useState<number[]>(defenderRolls);

  useEffect(() => {
    const interval = setInterval(() => {
      setTempAttacker(attackerRolls.map(() => Math.floor(Math.random() * 6) + 1));
      setTempDefender(defenderRolls.map(() => Math.floor(Math.random() * 6) + 1));
    }, 100);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setIsRolling(false);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-[#2b1e16] border-2 border-[#8c653d] p-6 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-6">
        <h3 className="text-2xl font-black text-amber-400 font-serif">🎲 میدان نبرد و پرتاب تاس</h3>

        <div className="space-y-6">
          <div className="bg-[#1a120b] p-4 rounded-xl border border-red-900/50">
            <p className="text-xs font-bold text-red-400 mb-3">تاس‌های مهاجم (قرمز)</p>
            <div className="flex justify-center gap-4">
              {(isRolling ? tempAttacker : attackerRolls).map((val, idx) => (
                <DiceFace key={idx} value={val} color="red" isRolling={isRolling} />
              ))}
            </div>
          </div>

          <div className="bg-[#1a120b] p-4 rounded-xl border border-blue-900/50">
            <p className="text-xs font-bold text-blue-400 mb-3">تاس‌های مدافع (آبی)</p>
            <div className="flex justify-center gap-4">
              {(isRolling ? tempDefender : defenderRolls).map((val, idx) => (
                <DiceFace key={idx} value={val} color="blue" isRolling={isRolling} />
              ))}
            </div>
          </div>
        </div>

        {!isRolling && (
          <div className="bg-[#1a120b] p-3 rounded-xl border border-[#8c653d]">
            <p className="text-sm font-bold text-emerald-400">{message}</p>
          </div>
        )}

        <button
          onClick={onClose}
          disabled={isRolling}
          className={`w-full py-3 font-bold rounded-xl transition shadow cursor-pointer ${
            isRolling ? 'bg-amber-950 text-amber-800 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
        >
          {isRolling ? 'در حال چرخش و پرتاب تاس‌ها...' : 'ادامه نبرد'}
        </button>
      </div>
    </div>
  );
};
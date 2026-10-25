import React, { useEffect, useState } from 'react';

interface DiceModalProps {
  attackerRolls: number[];
  defenderRolls: number[];
  message: string;
  onClose: () => void;
  // رنگ بازیکن‌ها؛ اگر داده نشود رنگ پیش‌فرض (قرمز/آبی) استفاده می‌شود
  attackerColor?: string | null;
  defenderColor?: string | null;
  attackerName?: string | null;
  defenderName?: string | null;
  conquered?: boolean;
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

// رنگ نقطه‌های تاس را بر اساس روشنایی رنگ بازیکن انتخاب می‌کنیم (روی زرد، نقطه‌ی تیره)
function pipColorFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#1a120b' : '#ffffff';
}

function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = 1 - amount;
  const r = Math.round((n >> 16) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const Die: React.FC<{ value: number; color: string; state?: 'win' | 'lose' | 'none'; rolling?: boolean }> = ({ value, color, state = 'none', rolling }) => {
  const pip = pipColorFor(color);
  return (
    <div
      className={`relative w-16 h-16 transition-all duration-300 ${rolling ? 'animate-bounce' : ''} ${state === 'lose' ? 'opacity-45 scale-90' : ''} ${state === 'win' ? 'scale-105' : ''}`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_3px_4px_rgba(0,0,0,0.6)]" role="img" aria-label={`تاس ${value}`}>
        <rect x="4" y="4" width="92" height="92" rx="18" fill={color} stroke={darken(color, 0.45)} strokeWidth="5" />
        <rect x="9" y="9" width="82" height="82" rx="14" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2" />
        {PIPS[value]?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8.5" fill={pip} />
        ))}
      </svg>
      {state === 'win' && <span className="absolute -top-2 -left-2 text-sm">✅</span>}
      {state === 'lose' && <span className="absolute -top-2 -left-2 text-sm">❌</span>}
    </div>
  );
};

export const DiceModal: React.FC<DiceModalProps> = ({
  attackerRolls,
  defenderRolls,
  message,
  onClose,
  attackerColor,
  defenderColor,
  attackerName,
  defenderName,
  conquered,
}) => {
  const aColor = attackerColor || '#dc2626';
  const dColor = defenderColor || '#2563eb';

  // انیمیشن کوتاه پرتاب؛ بعد نتیجه‌ی واقعی نشان داده می‌شود
  const [rolling, setRolling] = useState<boolean>(true);
  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    setRolling(true);
    const iv = setInterval(() => setTick((t) => t + 1), 80);
    const to = setTimeout(() => {
      setRolling(false);
      clearInterval(iv);
    }, 650);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [attackerRolls, defenderRolls]);

  const fake = (seed: number) => ((seed * 7 + tick * 3) % 6) + 1;

  // مقایسه‌ی جفت‌به‌جفت (بزرگ‌ترین‌ها با هم)؛ تساوی به نفع مدافع
  const pairs = Math.min(attackerRolls.length, defenderRolls.length);
  const attackerState = (i: number): 'win' | 'lose' | 'none' => (i < pairs ? (attackerRolls[i] > defenderRolls[i] ? 'win' : 'lose') : 'none');
  const defenderState = (i: number): 'win' | 'lose' | 'none' => (i < pairs ? (attackerRolls[i] > defenderRolls[i] ? 'lose' : 'win') : 'none');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" dir="rtl" onClick={() => !rolling && onClose()}>
      <div
        className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-md w-full text-center space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-amber-400">🎲 نتیجه‌ی نبرد</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-bold flex items-center justify-center gap-1.5" style={{ color: aColor }}>
              <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: aColor }} />
              مهاجم{attackerName ? ` (${attackerName})` : ''}
            </p>
            <div className="flex flex-wrap justify-center gap-2 min-h-[4.5rem]">
              {attackerRolls.map((v, i) => (
                <Die key={i} value={rolling ? fake(i + 1) : v} color={aColor} state={rolling ? 'none' : attackerState(i)} rolling={rolling} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold flex items-center justify-center gap-1.5" style={{ color: dColor }}>
              <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: dColor }} />
              مدافع{defenderName ? ` (${defenderName})` : ''}
            </p>
            <div className="flex flex-wrap justify-center gap-2 min-h-[4.5rem]">
              {defenderRolls.map((v, i) => (
                <Die key={i} value={rolling ? fake(i + 4) : v} color={dColor} state={rolling ? 'none' : defenderState(i)} rolling={rolling} />
              ))}
            </div>
          </div>
        </div>

        <p className={`text-sm font-bold ${conquered ? 'text-emerald-400' : 'text-amber-200'} min-h-[1.5rem]`}>{rolling ? '...' : message}</p>
        <p className="text-[10px] text-amber-300/60">هر تاس با تاس هم‌رتبه‌اش مقایسه می‌شود؛ در تساوی، مدافع برنده است.</p>

        <button
          onClick={onClose}
          disabled={rolling}
          className="px-8 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer"
        >
          ادامه
        </button>
      </div>
    </div>
  );
};

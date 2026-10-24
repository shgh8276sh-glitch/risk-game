import React, { useEffect } from 'react';

interface FortifyModalProps {
  sourceName: string;
  targetName: string;
  sourceArmies: number;
  targetArmies: number;
  amount: number;
  onChange: (n: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const FortifyModal: React.FC<FortifyModalProps> = ({
  sourceName,
  targetName,
  sourceArmies,
  targetArmies,
  amount,
  onChange,
  onConfirm,
  onCancel,
}) => {
  const max = Math.max(1, sourceArmies - 1); // حداقل یک سرباز باید در مبدأ بماند
  const clamp = (n: number) => Math.max(1, Math.min(max, n));
  const value = clamp(amount);
  const half = Math.max(1, Math.floor(max / 2));

  // میان‌برهای صفحه‌کلید: بالا/پایین یا +/- تغییر، Enter تایید، Esc انصراف
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onConfirm();
      else if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === '+') onChange(clamp(value + 1));
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === '-') onChange(clamp(value - 1));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, max, onChange, onConfirm, onCancel]);

  const stepBtn = 'w-12 h-12 rounded-xl bg-[#1a120b] border border-[#8c653d] hover:border-amber-400 text-xl font-black text-amber-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition';
  const quickBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition ${
      active ? 'bg-amber-600 border-amber-400 text-white' : 'bg-[#1a120b] border-[#8c653d]/70 text-amber-200 hover:border-amber-400'
    }`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" dir="rtl" onClick={onCancel}>
      <div
        className="bg-[#2b1e16] border-2 border-amber-600 p-6 rounded-2xl max-w-sm w-full text-center space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-amber-400">📦 جابجایی نیروها</h3>

        {/* پیش‌نمایش مبدأ و مقصد */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
          <div className="bg-[#1a120b] border border-[#8c653d]/70 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-amber-400/80">از</p>
            <p className="font-bold text-amber-100 truncate">{sourceName}</p>
            <p className="font-mono text-sm">
              <span className="text-amber-300/70">{sourceArmies}</span> ⬅ <span className="text-red-300 font-bold">{sourceArmies - value}</span>
            </p>
          </div>
          <span className="text-2xl text-amber-400">⬅</span>
          <div className="bg-[#1a120b] border border-[#8c653d]/70 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-amber-400/80">به</p>
            <p className="font-bold text-amber-100 truncate">{targetName}</p>
            <p className="font-mono text-sm">
              <span className="text-amber-300/70">{targetArmies}</span> ⬅ <span className="text-emerald-300 font-bold">{targetArmies + value}</span>
            </p>
          </div>
        </div>

        {/* انتخاب تعداد */}
        <div className="flex items-center justify-center gap-3">
          {max > 10 && (
            <button type="button" className={stepBtn + ' !w-10 text-xs'} onClick={() => onChange(clamp(value - 5))} disabled={value <= 1} aria-label="۵ تا کمتر">
              −۵
            </button>
          )}
          <button type="button" className={stepBtn} onClick={() => onChange(clamp(value - 1))} disabled={value <= 1} aria-label="یکی کمتر">
            −
          </button>
          <div className="min-w-[4.5rem] py-1.5 rounded-2xl bg-[#1a120b] border-2 border-emerald-500/70 text-3xl font-black font-mono text-emerald-400">
            {value}
          </div>
          <button type="button" className={stepBtn} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="یکی بیشتر">
            +
          </button>
          {max > 10 && (
            <button type="button" className={stepBtn + ' !w-10 text-xs'} onClick={() => onChange(clamp(value + 5))} disabled={value >= max} aria-label="۵ تا بیشتر">
              +۵
            </button>
          )}
        </div>

        <input
          type="range"
          min={1}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
          className="w-full accent-amber-500 cursor-pointer"
          aria-label="تعداد سرباز"
        />

        {/* انتخاب سریع */}
        <div className="flex justify-center gap-2">
          <button type="button" className={quickBtn(value === 1)} onClick={() => onChange(1)}>۱ سرباز</button>
          {half > 1 && half < max && (
            <button type="button" className={quickBtn(value === half)} onClick={() => onChange(half)}>نصف ({half})</button>
          )}
          {max > 1 && (
            <button type="button" className={quickBtn(value === max)} onClick={() => onChange(max)}>همه ({max})</button>
          )}
        </div>

        <p className="text-[10px] text-amber-300/60">حداقل یک سرباز در مبدأ می‌ماند • میان‌بر: ↑ ↓ تغییر، Enter تایید، Esc انصراف</p>

        <div className="flex gap-2">
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer">
            تایید جابجایی ({value})
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-xs cursor-pointer">
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};

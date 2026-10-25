import React, { useEffect } from 'react';

interface OccupyModalProps {
  fromName: string;
  toName: string;
  fromArmies: number; // سرباز فعلی مبدأ (بعد از انتقال حداقل)
  toArmies: number; // سرباز فعلی قلمرو فتح‌شده (برابر حداقل)
  min: number; // حداقل = تعداد تاس‌های پرتاب‌شده
  max: number; // حداکثر = همه به‌جز یک سرباز
  amount: number;
  onChange: (n: number) => void;
  onConfirm: () => void;
  busy?: boolean;
}

// پنجره‌ی انتقال سرباز بعد از فتح قلمرو (قابل بستن نیست؛ باید تعداد تایید شود)
export const OccupyModal: React.FC<OccupyModalProps> = ({ fromName, toName, fromArmies, toArmies, min, max, amount, onChange, onConfirm, busy }) => {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const value = clamp(amount);
  const extra = value - min; // سربازهای اضافه نسبت به حداقل
  const half = clamp(Math.floor((min + max) / 2));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onConfirm();
      else if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === '+') onChange(clamp(value + 1));
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === '-') onChange(clamp(value - 1));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, onChange, onConfirm]);

  const stepBtn = 'w-12 h-12 rounded-xl bg-[#1a120b] border border-[#8c653d] hover:border-amber-400 text-xl font-black text-amber-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition';
  const quick = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition ${active ? 'bg-amber-600 border-amber-400 text-white' : 'bg-[#1a120b] border-[#8c653d]/70 text-amber-200 hover:border-amber-400'}`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[55] p-4" dir="rtl">
      <div className="bg-[#2b1e16] border-2 border-emerald-500 p-6 rounded-2xl max-w-sm w-full text-center space-y-5 shadow-2xl">
        <h3 className="text-lg font-bold text-emerald-400">🏴 {toName} فتح شد!</h3>
        <p className="text-xs text-amber-200 leading-6">
          طبق قوانین، حداقل <b className="text-amber-100">{min}</b> سرباز (به تعداد تاس‌های پرتاب‌شده) وارد قلمرو فتح‌شده می‌شود. هر چند سرباز بیشتر هم می‌خواهید بفرستید انتخاب کنید (یک سرباز در {fromName} می‌ماند).
        </p>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
          <div className="bg-[#1a120b] border border-[#8c653d]/70 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-amber-400/80">مبدأ</p>
            <p className="font-bold text-amber-100 truncate">{fromName}</p>
            <p className="font-mono text-sm"><span className="text-amber-300/70">{fromArmies}</span> ⬅ <span className="text-red-300 font-bold">{fromArmies - extra}</span></p>
          </div>
          <span className="text-2xl text-amber-400">⬅</span>
          <div className="bg-[#1a120b] border border-emerald-700/70 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-amber-400/80">قلمرو جدید</p>
            <p className="font-bold text-amber-100 truncate">{toName}</p>
            <p className="font-mono text-sm"><span className="text-amber-300/70">{toArmies}</span> ⬅ <span className="text-emerald-300 font-bold">{toArmies + extra}</span></p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button type="button" className={stepBtn} onClick={() => onChange(clamp(value - 1))} disabled={value <= min || busy} aria-label="یکی کمتر">−</button>
          <div className="min-w-[4.5rem] py-1.5 rounded-2xl bg-[#1a120b] border-2 border-emerald-500/70 text-3xl font-black font-mono text-emerald-400">{value}</div>
          <button type="button" className={stepBtn} onClick={() => onChange(clamp(value + 1))} disabled={value >= max || busy} aria-label="یکی بیشتر">+</button>
        </div>

        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={busy}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
          className="w-full accent-emerald-500 cursor-pointer"
          aria-label="تعداد سرباز"
        />

        <div className="flex justify-center gap-2">
          <button type="button" className={quick(value === min)} onClick={() => onChange(min)}>حداقل ({min})</button>
          {half > min && half < max && <button type="button" className={quick(value === half)} onClick={() => onChange(half)}>نصف ({half})</button>}
          {max > min && <button type="button" className={quick(value === max)} onClick={() => onChange(max)}>همه ({max})</button>}
        </div>

        <button onClick={onConfirm} disabled={busy} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-bold text-xs cursor-pointer">
          {busy ? 'در حال ثبت...' : `تایید انتقال ${value} سرباز`}
        </button>
      </div>
    </div>
  );
};

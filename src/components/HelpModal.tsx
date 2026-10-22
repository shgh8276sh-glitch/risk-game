import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-[#2b1e16] border-2 border-[#8c653d] p-6 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl text-amber-100 space-y-5">
        
        {/* هدر مدال */}
        <div className="flex justify-between items-center border-b border-[#8c653d] pb-3">
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <span>❓</span> راهنمای جامع قوانین و نمادهای بازی ریسک (Risk)
          </h2>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-white font-bold text-lg bg-amber-900/60 px-3 py-1 rounded-lg border border-amber-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ۱. فازهای سه گانه بازی */}
        <section className="bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]/60 space-y-2">
          <h3 className="font-bold text-amber-300 text-sm border-b border-[#8c653d]/40 pb-1">
            🔄 ۱. فازهای اصلی هر نوبت
          </h3>
          <ul className="text-xs space-y-1.5 leading-relaxed text-amber-200/90 list-disc list-inside">
            <li><strong className="text-amber-100">فاز ۱ (پخش نیرو):</strong> دریافت نیروهای جدید و قرار دادن آن‌ها روی مناطق خودی. در این فاز می‌توانید کارت‌های خود را نیز بسوزانید.</li>
            <li><strong className="text-amber-100">فاز ۲ (حمله):</strong> حمله از مناطق خودی با حداقل ۲ سرباز به مناطق همسایه دشمن جهت فتح جهان.</li>
            <li><strong className="text-amber-100">فاز ۳ (جابه‌جایی/تقویت):</strong> منتقل کردن نیروها بین مناطق همسایه خودی برای تحکیم مرزها.</li>
          </ul>
        </section>

        {/* ۲. قانون محاسباتی نیروهای ورودی */}
        <section className="bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]/60 space-y-2">
          <h3 className="font-bold text-amber-300 text-sm border-b border-[#8c653d]/40 pb-1">
            🪖 ۲. محاسبه تعداد سربازان در ابتدای نوبت
          </h3>
          <p className="text-xs leading-relaxed text-amber-200/90">
            تعداد سربازانی که در ابتدای نوبت می‌گیرید از فرمول زیر به دست می‌آید:
          </p>
          <div className="bg-[#2b1e16] p-2.5 rounded-lg border border-[#8c653d] text-xs font-mono text-emerald-400 space-y-1">
            <div>• تعداد قلمروها = ۳ (حداقل ۳ سرباز)</div>
            <div>• ۱ تا ۱۱ قلمرو = ۳ سرباز | ۱۲ تا ۱۴ = ۴ سرباز | ۱۵ تا ۱۷ = ۵ سرباز ...</div>
            <div>• پاداش تسخیر کامل قاره‌ها (آسیا ۷+، آمریکای شمالی ۵+، اروپا ۵+، آفریقا ۳+، آمریکای جنوبی ۲+، استرالیا ۲+)</div>
            <div>• پاداش سوزاندن ست ۳‌تایی کارت‌ها</div>
          </div>
        </section>

        {/* ۳. قوانین کارت‌ها و نمادها */}
        <section className="bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]/60 space-y-2">
          <h3 className="font-bold text-amber-300 text-sm border-b border-[#8c653d]/40 pb-1">
            🃏 ۳. نمادها و سوزاندن کارت‌ها
          </h3>
          <div className="text-xs space-y-2 leading-relaxed text-amber-200/90">
            <p>با تسخیر حداقل ۱ قلمرو در طول نوبت، ۱ کارت قلمرو جایزه می‌گیرید.</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#2b1e16] p-2 rounded border border-[#8c653d]">🪖 🪖 🪖 ۳ پیاده‌نظام = ۴ سرباز</div>
              <div className="bg-[#2b1e16] p-2 rounded border border-[#8c653d]">🐎 🐎 🐎 ۳ سواره‌نظام = ۶ سرباز</div>
              <div className="bg-[#2b1e16] p-2 rounded border border-[#8c653d]">💥 💥 💥 ۳ توپخانه = ۸ سرباز</div>
              <div className="bg-[#2b1e16] p-2 rounded border border-[#8c653d]">🪖 🐎 💥 ۳ نماد متفاوت = ۱۰ سرباز</div>
            </div>
          </div>
        </section>

        {/* ۴. تاس و مکانیزم نبرد */}
        <section className="bg-[#1a120b] p-4 rounded-xl border border-[#8c653d]/60 space-y-2">
          <h3 className="font-bold text-amber-300 text-sm border-b border-[#8c653d]/40 pb-1">
            🎲 ۴. قوانین نبرد و پرتاب تاس
          </h3>
          <p className="text-xs leading-relaxed text-amber-200/90">
            مهاجم با تاس قرمز و مدافع با تاس آبی تاس می‌ریزند. بزرگ‌ترین تاس مهاجم با بزرگ‌ترین تاس مدافع مقایسه می‌شود. در صورت مساوی بودن اعداد تاس، مدافع برنده است!
          </p>
        </section>

        {/* دکمه بستن */}
        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl transition cursor-pointer shadow-lg"
          >
            متوجه شدم و بازگشت به بازی
          </button>
        </div>

      </div>
    </div>
  );
};
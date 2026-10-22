'use client';

import React from 'react';
import { TERRITORIES } from '../game/data/territories';
import { GameState } from '../game/engine/state';
import { ArmyToken } from './ArmyToken';

interface MapProps {
  state: GameState;
  onSelectTerritory: (id: string) => void;
  currentUsername?: string;
}

export const Map: React.FC<MapProps> = ({ state, onSelectTerritory }) => {
  return (
    <div className="w-full max-w-6xl flex flex-col items-center gap-4" dir="rtl">
      {/* راهنماهای بالای نقشه */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif">
        
        {/* ۱. پاداش قاره‌ها */}
        <div className="bg-[#2b1e16] border border-[#8c653d] p-3 rounded-xl text-amber-200 shadow-md space-y-2">
          <p className="font-bold text-amber-400 border-b border-[#8c653d]/50 pb-1 flex items-center gap-1">
            <span>🌍</span> پاداش تسخیر کامل قاره‌ها (در هر نوبت):
          </p>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-emerald-400 font-bold bg-[#1a120b] p-2 rounded-lg border border-[#8c653d]/40">
            <span>آسیا: ۷+ سرباز</span>
            <span>آم. شمالی: ۵+ سرباز</span>
            <span>اروپا: ۵+ سرباز</span>
            <span>آفریقا: ۳+ سرباز</span>
            <span>آم. جنوبی: ۲+ سرباز</span>
            <span>استرالیا: ۲+ سرباز</span>
          </div>
          <p className="text-[10px] text-amber-300/80 italic">
            * نیروهای قاره به سربازان دریافتی از تعداد قلمروها و کارت‌ها اضافه می‌شوند.
          </p>
        </div>

        {/* ۲. راهنمای جامع کارت‌ها و قانون قلمروها */}
        <div className="bg-[#2b1e16] border border-[#8c653d] p-3 rounded-xl text-amber-200 shadow-md space-y-2">
          <p className="font-bold text-amber-400 border-b border-[#8c653d]/50 pb-1 flex items-center gap-1">
            <span>🃏</span> راهنمای جامع کارت‌ها و قانون قلمروها:
          </p>
          
          <div className="space-y-2 text-[11px] leading-relaxed">
            <div>
              <span className="text-amber-300 font-bold">روش ۱ (نمادها - ۳ کارت):</span>
              <span className="block text-[10px] text-amber-100/90 mr-2">
                🪖🪖🪖 ۳ پیاده (۴) | 🐎🐎🐎 ۳ سواره (۶) | 💥💥💥 ۳ توپخانه (۸) | 🪖🐎💥 ۳ متفاوت (۱۰)
              </span>
            </div>

            <div>
              <span className="text-amber-300 font-bold">روش ۲ (بر اساس مجموع ستاره‌ها ⭐):</span>
              <div className="font-mono text-emerald-400 font-bold text-[10px] bg-[#1a120b] px-2 py-1 rounded border border-[#8c653d]/40 mt-0.5">
                ۲⭐ = ۲ سرباز | ۳⭐ = ۴ سرباز | ۴⭐ = ۷ سرباز | ۵⭐ = ۱۰ سرباز | ۶⭐ = ۱۳ سرباز
              </div>
            </div>

            <div>
              <span className="text-amber-300 font-bold">قانون پایه (تعداد قلمروهای تحت کنترل):</span>
              <div className="font-mono text-emerald-400 font-bold text-[10px] bg-[#1a120b] px-2 py-1 rounded border border-[#8c653d]/40 mt-0.5">
                ۱ تا ۱۱ قلمرو: ۳ | ۱۲ تا ۱۴: ۴ | ۱۵ تا ۱۷: ۵ | ۱۸ تا ۲۰: ۶ | ۲۱ تا ۲۳: ۷ سرباز
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* کادر اصلی نقشه */}
      <div className="relative w-full aspect-[1000/600] bg-[#2b1e16] rounded-2xl shadow-2xl overflow-hidden border-4 border-[#8c653d] flex items-center justify-center">
        <img
          src="/risk-map.png"
          alt="Risk Board Game Map"
          className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
        />

        <svg viewBox="0 0 1000 600" className="w-full h-full relative z-10 pointer-events-none">
          {TERRITORIES.map((t) => {
            const tState = state.territories[t.id];
            const isSelected = state.selectedTerritoryId === t.id || state.fortifySourceId === t.id;
            const isTarget = state.attackTargetId === t.id;
            const owner = state.players.find((p) => p.id === tState?.ownerId);
            const color = owner ? owner.color : '#78716c';

            return (
              <g key={t.id}>
                <foreignObject
                  x={t.labelPosition.x - 18}
                  y={t.labelPosition.y - 18}
                  width="36"
                  height="36"
                  className="overflow-visible pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTerritory(t.id);
                  }}
                >
                  <ArmyToken
                    armies={tState?.armies || 1}
                    color={color}
                    isSelected={isSelected}
                    isTarget={isTarget}
                  />
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
import React from 'react';

interface ArmyTokenProps {
  armies: number;
  color: string;
  isSelected?: boolean;
  isTarget?: boolean;
}

export const ArmyToken: React.FC<ArmyTokenProps> = ({ armies, color, isSelected, isTarget }) => {
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shadow-2xl transition-all transform hover:scale-125 border-2 ${
        isSelected
          ? 'border-yellow-300 ring-4 ring-yellow-400/80 scale-125 z-30'
          : isTarget
          ? 'border-red-500 ring-4 ring-red-500/80 scale-125 z-30 animate-ping'
          : 'border-slate-900/90'
      }`}
      style={{
        backgroundColor: color,
        boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
      }}
    >
      <span className="drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] select-none font-sans">
        {armies}
      </span>
    </div>
  );
};
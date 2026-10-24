import React from 'react';

export type SymbolType = 'infantry' | 'cavalry' | 'artillery' | 'wild';

export const SYMBOL_LABEL: Record<SymbolType, string> = {
  infantry: 'پیاده',
  cavalry: 'سواره',
  artillery: 'توپخانه',
  wild: 'جوکر',
};

interface CardSymbolProps {
  type: SymbolType;
  size?: number;
  className?: string;
}

// آیکون‌های برداری نمادهای کارت (پیاده‌نظام، سواره‌نظام، توپخانه)
export const CardSymbol: React.FC<CardSymbolProps> = ({ type, size = 48, className }) => {
  const common = { width: size, height: size, viewBox: '0 0 64 64', className, role: 'img' as const, 'aria-label': SYMBOL_LABEL[type] };

  if (type === 'infantry') {
    return (
      <svg {...common}>
        <path d="M46 60 L41 22" stroke="#6b4a2b" strokeWidth="3" strokeLinecap="round" />
        <path d="M41 22 L40 15" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 60 C8 47 18 42 30 42 C42 42 52 47 52 60 Z" fill="#4d6b3a" stroke="#2c4020" strokeWidth="1.5" />
        <path d="M22 44 L30 56 L38 44" fill="none" stroke="#2c4020" strokeWidth="1.5" />
        <rect x="25" y="34" width="10" height="9" rx="2" fill="#e0b48a" />
        <ellipse cx="30" cy="27" rx="9" ry="10" fill="#e8c29b" stroke="#a87b52" strokeWidth="1" />
        <path d="M19 27 C19 14 24 9 30 9 C36 9 41 14 41 27 L45 29 L15 29 Z" fill="#5b7a45" stroke="#2c4020" strokeWidth="1.5" />
        <rect x="14" y="26" width="32" height="4.5" rx="2.2" fill="#3e5730" stroke="#2c4020" strokeWidth="1" />
        <path d="M30 12 L31.3 15.2 L34.7 15.4 L32 17.5 L33 20.8 L30 18.9 L27 20.8 L28 17.5 L25.3 15.4 L28.7 15.2 Z" fill="#fbbf24" />
        <circle cx="26.3" cy="32" r="1.1" fill="#3b2a1a" />
        <circle cx="33.7" cy="32" r="1.1" fill="#3b2a1a" />
      </svg>
    );
  }

  if (type === 'cavalry') {
    return (
      <svg {...common}>
        <path
          d="M14 60 L14 54 C14 47 18 43 22 39 C25 36 27 34 27 31 C23 31 19 33 15 36 L9 33 C9 28 13 22 17 19 L18 10 L24 15 C28 11 34 9 40 10 C51 12 57 22 56 35 C55 45 51 51 51 60 Z"
          fill="#b9854e"
          stroke="#6b4423"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M24 15 C30 14 38 17 42 25 C45 31 44 38 42 44" fill="none" stroke="#6b4423" strokeWidth="3" strokeLinecap="round" />
        <path d="M27 17 C33 17 39 21 41 27" fill="none" stroke="#3b2a1a" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 3.6" />
        <circle cx="22" cy="24" r="2" fill="#1a120b" />
        <circle cx="22.7" cy="23.3" r=".7" fill="#fff" />
        <circle cx="11.5" cy="35" r="1.1" fill="#6b4423" />
        <path d="M12 60 H53" stroke="#6b4423" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'artillery') {
    return (
      <svg {...common}>
        <g transform="rotate(-16 34 30)">
          <rect x="6" y="22" width="40" height="14" rx="5" fill="#5f6b78" stroke="#2b333b" strokeWidth="2" />
          <rect x="3" y="19.5" width="9" height="19" rx="3" fill="#7a8794" stroke="#2b333b" strokeWidth="2" />
          <circle cx="48" cy="29" r="8" fill="#4b5560" stroke="#2b333b" strokeWidth="2" />
          <circle cx="52" cy="29" r="2.4" fill="#2b333b" />
          <rect x="22" y="22" width="3" height="14" fill="#8e9baa" />
        </g>
        <circle cx="30" cy="46" r="13" fill="#a8743f" stroke="#5a3a1c" strokeWidth="2.4" />
        <circle cx="30" cy="46" r="9.5" fill="none" stroke="#5a3a1c" strokeWidth="1.2" />
        <path d="M30 33 V59 M17 46 H43 M20.8 36.8 L39.2 55.2 M39.2 36.8 L20.8 55.2" stroke="#5a3a1c" strokeWidth="1.6" />
        <circle cx="30" cy="46" r="3.4" fill="#3b2a1a" />
        <circle cx="9" cy="55" r="5.2" fill="#2e3640" stroke="#12171c" strokeWidth="1.4" />
        <circle cx="7.5" cy="53.5" r="1.4" fill="#6b7885" />
      </svg>
    );
  }

  // جوکر
  return (
    <svg {...common}>
      <circle cx="32" cy="32" r="24" fill="#7c3aed" stroke="#4c1d95" strokeWidth="2.5" />
      <path d="M32 12 L36.5 25 L50 25.5 L39.5 33.5 L43.5 47 L32 39 L20.5 47 L24.5 33.5 L14 25.5 L27.5 25 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
    </svg>
  );
};

interface StarsProps {
  count: number;
  size?: number;
}

// ستاره‌های برداری (۱ یا ۲ ستاره روی کارت)
export const Stars: React.FC<StarsProps> = ({ count, size = 16 }) => (
  <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${count} ستاره`}>
    {Array.from({ length: count }).map((_, i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12 2 L14.9 8.6 L22 9.3 L16.7 14 L18.2 21 L12 17.4 L5.8 21 L7.3 14 L2 9.3 L9.1 8.6 Z"
          fill="#fbbf24"
          stroke="#b45309"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    ))}
  </span>
);

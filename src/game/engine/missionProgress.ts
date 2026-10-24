import { GameState } from './state';
import { TERRITORIES } from '../data/territories';

export interface MissionProgress {
  detail: string; // توضیح متنی پیشرفت
  ratio: number | null; // ۰ تا ۱ برای نوار پیشرفت؛ null یعنی نوار نداریم
  done: boolean;
}

const COLOR_BY_WORD: Record<string, string> = {
  'قرمز': '#dc2626',
  'آبی': '#2563eb',
  'سبز': '#16a34a',
  'زرد': '#eab308',
  'بنفش': '#9333ea',
};

const CONTINENT_BY_NAME: Record<string, { id: string; label: string }> = {
  'آمریکای شمالی': { id: 'na', label: 'آمریکای شمالی' },
  'آمریکای جنوبی': { id: 'sa', label: 'آمریکای جنوبی' },
  'اروپا': { id: 'eu', label: 'اروپا' },
  'آفریقا': { id: 'af', label: 'آفریقا' },
  'آسیا': { id: 'as', label: 'آسیا' },
  'استرالیا': { id: 'au', label: 'استرالیا' },
};

const toLatinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

// پیشرفت ماموریت برای نمایش به خودِ بازیکن (برد واقعی را سرور تشخیص می‌دهد)
export function getMissionProgress(mission: string, state: GameState, playerId: string): MissionProgress | null {
  const t = toLatinDigits(mission);
  const owned = Object.values(state.territories).filter((x) => x.ownerId === playerId);
  const countMatch = t.match(/(\d+)\s*منطقه/);

  const countProgress = (target: number): MissionProgress => ({
    detail: `${owned.length} از ${target} منطقه`,
    ratio: Math.min(1, owned.length / target),
    done: owned.length >= target,
  });

  if (/نابود/.test(t)) {
    const m = t.match(/ارتش\s+(\S+)\s+را\s+نابود/);
    const color = m ? COLOR_BY_WORD[m[1]] : undefined;
    const target = color ? state.players.find((p) => p.color === color) : undefined;
    const fallback = countMatch ? Number(countMatch[1]) : 24;

    if (!target || target.id === playerId) return countProgress(fallback);

    const remaining = Object.values(state.territories).filter((x) => x.ownerId === target.id).length;
    if (remaining === 0) {
      const killer = (state.eliminatedBy || {})[target.id];
      if (killer === playerId) return { detail: `ارتش ${target.name} نابود شد ✔`, ratio: 1, done: true };
      return countProgress(fallback); // کس دیگری او را حذف کرده؛ ماموریت جایگزین
    }
    return { detail: `ارتش ${target.name} (${m ? m[1] : ''}): ${remaining} قلمرو باقی مانده`, ratio: null, done: false };
  }

  if (/دست.?کم/.test(t) && countMatch) {
    const target = Number(countMatch[1]);
    const u = t.match(/(\d+)\s*واحد/);
    const minArmies = u ? Number(u[1]) : 2;
    const ok = owned.filter((x) => x.armies >= minArmies).length;
    return { detail: `${ok} از ${target} منطقه با حداقل ${minArmies} سرباز`, ratio: Math.min(1, ok / target), done: ok >= target };
  }

  const conts = Object.keys(CONTINENT_BY_NAME).filter((n) => t.includes(n));
  if (conts.length > 0) {
    const ids = conts.map((n) => CONTINENT_BY_NAME[n].id);
    const needed = TERRITORIES.filter((x) => ids.includes(x.continentId));
    const have = needed.filter((x) => state.territories[x.id]?.ownerId === playerId).length;
    return { detail: `${have} از ${needed.length} منطقه‌ی ${conts.join(' و ')}`, ratio: needed.length ? have / needed.length : 0, done: have === needed.length };
  }

  if (countMatch) return countProgress(Number(countMatch[1]));
  return null;
}

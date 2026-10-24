import React, { useState } from 'react';

export interface AdminRoomInfo {
  code: string;
  started: boolean;
  turnNumber: number | null;
  winner: string | null;
  players: { name: string; status: string; isHost: boolean }[];
  lastActivity: number;
  createdAt: number;
}

interface AdminRoomsPanelProps {
  rooms: AdminRoomInfo[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (code: string) => void;
  onDeleteIdle: () => void;
  onClose: () => void;
}

const timeAgo = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'همین الان';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} دقیقه پیش`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ساعت پیش`;
  return `${Math.round(h / 24)} روز پیش`;
};

const STATUS_DOT: Record<string, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-orange-400',
  left: 'bg-gray-500',
};

export const AdminRoomsPanel: React.FC<AdminRoomsPanelProps> = ({ rooms, loading, onRefresh, onDelete, onDeleteIdle, onClose }) => {
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const [confirmIdle, setConfirmIdle] = useState<boolean>(false);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" dir="rtl" onClick={onClose}>
      <div
        className="bg-[#2b1e16] border-2 border-amber-600 p-5 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-amber-400">🛠️ مدیریت روم‌ها (ادمین)</h3>
          <button onClick={onRefresh} className="text-xs bg-amber-800 hover:bg-amber-700 text-amber-200 px-3 py-1 rounded-lg cursor-pointer">
            {loading ? '...' : '🔄 بروزرسانی'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {rooms.length === 0 && !loading && <p className="text-xs text-amber-300/70 text-center py-8">هیچ رومی وجود ندارد.</p>}
          {rooms.map((r) => {
            const online = r.players.filter((p) => p.status === 'online').length;
            return (
              <div key={r.code} className="bg-[#1a120b] border border-[#8c653d]/70 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-extrabold text-emerald-400 tracking-widest">{r.code}</span>
                  <span className="text-[10px] text-amber-300/70">
                    {r.winner ? `🏆 برنده: ${r.winner}` : r.started ? `در حال بازی • نوبت ${r.turnNumber ?? 1}` : 'در لابی'} • {timeAgo(r.lastActivity)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.players.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-[11px] bg-[#2b1e16] px-2 py-1 rounded-lg border border-[#8c653d]/40">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[p.status] || 'bg-gray-500'}`} />
                      {p.name}
                      {p.isHost && <span className="text-[9px] text-amber-400">Host</span>}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-300/60">{online} نفر آنلاین از {r.players.length}</span>
                  {confirmCode === r.code ? (
                    <span className="flex gap-2">
                      <button
                        onClick={() => { setConfirmCode(null); onDelete(r.code); }}
                        className="text-[11px] bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded-lg font-bold cursor-pointer"
                      >
                        بله، حذف شود
                      </button>
                      <button onClick={() => setConfirmCode(null)} className="text-[11px] bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg cursor-pointer">
                        انصراف
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmCode(r.code)}
                      className="text-[11px] bg-red-900/70 hover:bg-red-800 text-red-100 border border-red-700/60 px-3 py-1 rounded-lg cursor-pointer"
                    >
                      🗑️ حذف روم
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2 border-t border-[#8c653d]/40">
          {confirmIdle ? (
            <>
              <button
                onClick={() => { setConfirmIdle(false); onDeleteIdle(); }}
                className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                بله، رومهای بدون بازیکن آنلاین حذف شوند
              </button>
              <button onClick={() => setConfirmIdle(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs cursor-pointer">
                انصراف
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmIdle(true)}
                disabled={rooms.length === 0}
                className="flex-1 py-2 bg-red-900/70 hover:bg-red-800 text-red-100 border border-red-700/60 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🧹 حذف رومهای بدون بازیکن آنلاین
              </button>
              <button onClick={onClose} className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer">
                بستن
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

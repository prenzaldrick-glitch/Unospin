import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, History, ArrowLeft, Wallet } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { WithdrawalRecord } from '../../types';
import { soundFx } from '../../utils/sound';

interface WithdrawalHistoryModalProps {
  currentUid: string;
  onClose: () => void;
}

export const WithdrawalHistoryModal: React.FC<WithdrawalHistoryModalProps> = ({
  currentUid,
  onClose,
}) => {
  const [records, setRecords] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'withdrawals'),
      where('uid', '==', currentUid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WithdrawalRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as WithdrawalRecord);
        });
        setRecords(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching withdrawal history:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[420px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-5 border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.25)] text-white flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide font-sans">
                Withdrawal History
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold block">
                Your personal cashout transactions
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Records Content */}
        <div className="my-4 flex-1 overflow-y-auto pr-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading withdrawal history...
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
              <div className="p-4 rounded-full bg-slate-900/80 border border-slate-800 text-slate-500">
                <Wallet className="w-8 h-8" />
              </div>
              <span className="text-sm font-bold text-slate-300">
                No withdrawal history yet.
              </span>
              <p className="text-xs text-slate-500 max-w-[240px]">
                Spin the wheel to reach ₱500 and request your cashout!
              </p>
            </div>
          ) : (
            records.map((record) => {
              const isGcash = record.walletType === 'gcash';
              const walletName = isGcash ? 'GCash' : 'Maya';
              const formattedAmt = record.amount?.toFixed(2) || '500.00';
              const displayTime = record.timestamp || `${record.formattedDate} • ${record.formattedTime}`;

              return (
                <div
                  key={record.id}
                  className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800/90 hover:border-slate-700/80 transition-all flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-3">
                    {/* Method Icon / Badge */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md shrink-0 ${
                        isGcash
                          ? 'bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/40'
                          : 'bg-gradient-to-br from-emerald-500 to-emerald-700 border border-emerald-400/40'
                      }`}
                    >
                      {walletName}
                    </div>

                    <div>
                      {/* Amount & Method */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-yellow-300">
                          ₱{formattedAmt}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">
                          via {walletName}
                        </span>
                      </div>

                      {/* Status Line */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] font-bold text-emerald-400">
                          Status: Completed
                        </span>
                      </div>

                      {/* Date & Time */}
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        {displayTime}
                      </span>
                    </div>
                  </div>

                  {/* Success Check Badge */}
                  <div className="p-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Back / Close Action */}
        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Close History</span>
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WithdrawalRecord } from '../types';

export const RecentActivityPill: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'withdrawals'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: WithdrawalRecord[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          const displayName = (raw.userDisplayName || raw.fullname || raw.nickname || raw.accountName || '').toLowerCase();
          // Exclude "Lavigne Asombrado" / "Lavigne" entry
          if (!displayName.includes('lavigne')) {
            records.push({ id: docSnap.id, ...raw } as WithdrawalRecord);
          }
        });
        setWithdrawals(records);
        setIndex(0);
      },
      (err) => {
        console.warn('Error fetching recent withdrawals:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (withdrawals.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % withdrawals.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [withdrawals.length]);

  if (withdrawals.length === 0) {
    return (
      <div className="w-full px-4 pt-1 flex justify-end z-20">
        <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-400/30 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-md text-[11px] text-cyan-200">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-white/80 font-semibold">Live Cashouts Active</span>
        </div>
      </div>
    );
  }

  const current = withdrawals[index];
  const isGcash = current.walletType === 'gcash';

  return (
    <div className="w-full px-4 pt-1 flex justify-end z-20">
      <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-400/40 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-lg shadow-black/50 text-[11px] font-medium text-cyan-200 animate-fadeIn transition-all">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        
        {/* E-wallet Logo Badge */}
        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
          isGcash ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {isGcash ? 'GCash' : 'Maya'}
        </span>

        {/* User Name */}
        <span className="text-white/95 font-bold truncate max-w-[90px]">
          {current.userDisplayName || 'Player'}
        </span>

        {/* Amount */}
        <span className="text-yellow-300 font-black">
          ₱{current.amount?.toFixed(2) || '500.00'}
        </span>

        {/* Status */}
        <span className="text-emerald-400 text-[10px] font-extrabold">
          ✓ Success
        </span>

        {/* Exact Time */}
        <span className="text-slate-400 text-[9px] font-mono ml-0.5">
          {current.formattedTime || ''}
        </span>
      </div>
    </div>
  );
};

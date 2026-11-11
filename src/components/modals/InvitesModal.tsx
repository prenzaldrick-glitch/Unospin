import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, Share2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Clock, ShieldCheck, Lock, Unlock, Sparkles, Tv } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserState, ReferralRecord } from '../../types';
import { soundFx } from '../../utils/sound';
import { buildReferralLink, getLocalReferrals } from '../../lib/referrals';
import { LiveWithdrawalTracker } from '../LiveWithdrawalTracker';
import { ADS_REQUIRED_FOR_WITHDRAWAL, VALID_REFS_REQUIRED_FOR_WITHDRAWAL, TASKS_REQUIRED_PER_REFERRAL } from '../../lib/withdrawalVerification';

interface InvitesModalProps {
  userState: UserState;
  onClose: () => void;
  onOpenCashout?: () => void;
  onOpenOffers?: () => void;
}

export const InvitesModal: React.FC<InvitesModalProps> = ({
  userState,
  onClose,
  onOpenCashout,
  onOpenOffers,
}) => {
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const completedAdsCount = Array.isArray(userState.completedAdTasks) ? userState.completedAdTasks.length : 0;

  // Generate invite link with canonical domain
  const myRefCode = (userState.referralCode || userState.userId || 'CODE').trim().toUpperCase();
  const inviteLink = buildReferralLink(myRefCode);

  // Helper to format ISO date string
  const formatDate = (isoStr?: string) => {
    if (!isoStr) {
      return new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Today';
    }
  };

  // Safe nickname / user display label
  const formatUserLabel = (item: ReferralRecord, index: number) => {
    if (item.invitedNickname && item.invitedNickname.length >= 2) {
      return item.invitedNickname;
    }
    if (item.invitedUid) {
      return `User #${item.invitedUid.slice(0, 5).toUpperCase()}`;
    }
    return `Member #${index + 1}`;
  };

  // Real-time listener for Firebase Referral records
  useEffect(() => {
    if (!myRefCode) {
      setLoading(false);
      return;
    }

    const recordsMap = new Map<string, ReferralRecord>();

    const updateReferralsState = () => {
      const list = Array.from(recordsMap.values());
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReferrals(list);
      setLoading(false);
    };

    // 1. Immediately load local referrals from localStorage
    const localList = getLocalReferrals(myRefCode);
    if (localList.length > 0) {
      localList.forEach((r) => recordsMap.set(r.id, r));
      updateReferralsState();
    } else {
      setLoading(false);
    }

    const processSnapshot = (snapshot: any) => {
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        const completedTasks = typeof data.completedTasksCount === 'number' ? data.completedTasksCount : 0;
        const isValid = completedTasks >= 15 || data.status === 'VALID';

        recordsMap.set(docSnap.id, {
          id: docSnap.id,
          inviterUid: data.inviterUid || myRefCode,
          inviterRefCode: data.inviterRefCode || myRefCode,
          invitedUid: data.invitedUid || docSnap.id,
          invitedNickname: data.invitedNickname || 'User',
          referralCode: data.referralCode || myRefCode,
          status: isValid ? 'VALID' : 'PENDING',
          completedTasksCount: completedTasks,
          createdAt: data.createdAt || new Date().toISOString(),
          validatedAt: data.validatedAt || null,
        });
      });
      updateReferralsState();
    };

    const refQuery1 = query(
      collection(db, 'referrals'),
      where('inviterRefCode', '==', myRefCode)
    );

    const unsub1 = onSnapshot(refQuery1, processSnapshot, () => {
      setLoading(false);
    });

    let unsub2: (() => void) | null = null;
    if (userState.uid && userState.uid.startsWith('usr_')) {
      const refQuery2 = query(
        collection(db, 'referrals'),
        where('inviterUid', '==', userState.uid)
      );
      unsub2 = onSnapshot(refQuery2, processSnapshot, () => {});
    }

    return () => {
      unsub1();
      if (unsub2) unsub2();
    };
  }, [myRefCode, userState.uid]);

  // Statistics calculated directly from Firebase records
  const totalInvited = referrals.length;
  // A referral is VALID if they completed at least 15 ad tasks
  const validCount = referrals.filter((r) => (r.completedTasksCount || 0) >= 15 || r.status === 'VALID').length;
  const pendingCount = totalInvited - validCount;
  const isWithdrawalUnlocked = validCount >= 8;
  const activationProgressPercent = Math.min(100, Math.round((validCount / 8) * 100));

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    } catch {}
  };

  const handleCopyLink = () => {
    soundFx.playClick();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteLink).catch(() => {
        fallbackCopyText(inviteLink);
      });
    } else {
      fallbackCopyText(inviteLink);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    soundFx.playClick();
    if (navigator.share) {
      navigator.share({
        title: 'UNO SPIN PHP',
        text: '🎉 Join UNO SPIN PHP! Complete ad tasks and withdraw real cash via GCash or Maya.',
        url: inviteLink,
      }).catch(() => {
        handleCopyLink();
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-[440px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-4 sm:p-5 border-2 border-cyan-400/80 shadow-[0_0_35px_rgba(6,182,212,0.4)] text-white flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-teal-400 to-emerald-400 p-0.5 flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide font-sans leading-none">
                Referral & Invites Center
              </h2>
              <span className="text-[11px] font-bold text-cyan-300 mt-0.5 block">
                Code: <span className="font-mono text-yellow-300 font-extrabold">{myRefCode}</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LIVE WITHDRAWAL ACTIVATION PROGRESS TRACKER (30 ADS & 8 VALID REFERRALS) */}
        <LiveWithdrawalTracker
          variant="full"
          completedAdsCount={completedAdsCount}
          validReferralsCount={validCount}
          onOpenOffers={onOpenOffers}
          onOpenCashout={onOpenCashout}
          className="my-2.5"
        />

        {/* STATISTICS CARDS (3-COLUMN OVERVIEW) */}
        <div className="grid grid-cols-3 gap-2 my-1">
          {/* TOTAL INVITED */}
          <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 text-center shadow">
            <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
              TOTAL INVITES
            </span>
            <span className="text-xl font-black text-cyan-300 my-0.5 block font-mono">
              {totalInvited}
            </span>
            <span className="text-[8.5px] font-bold text-slate-400 block">Registered</span>
          </div>

          {/* VALID (>=15 TASKS) */}
          <div className="bg-slate-900/90 p-2.5 rounded-2xl border-2 border-emerald-500/70 text-center shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400" />
            <span className="text-[9px] font-black text-emerald-400 block uppercase tracking-wider">
              VALID (15/15)
            </span>
            <span className="text-xl font-black text-emerald-300 my-0.5 block font-mono">
              {validCount}
            </span>
            <span className="text-[8.5px] font-bold text-slate-300 block">Completed</span>
          </div>

          {/* PENDING (<15 TASKS) */}
          <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-amber-500/50 text-center shadow">
            <span className="text-[9px] font-black text-amber-400 block uppercase tracking-wider">
              PENDING
            </span>
            <span className="text-xl font-black text-amber-300 my-0.5 block font-mono">
              {pendingCount}
            </span>
            <span className="text-[8.5px] font-bold text-slate-400 block">&lt;15 Tasks</span>
          </div>
        </div>

        {/* PERSONAL INVITE LINK */}
        <div className="my-2.5 p-3 rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-extrabold text-cyan-300">
              Your Personal Referral Link:
            </label>
            <span className="text-[9.5px] text-emerald-400 font-mono font-black bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Link
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
            <input
              type="text"
              readOnly
              value={inviteLink}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="bg-transparent text-[11px] text-cyan-200 font-mono w-full focus:outline-none truncate select-all cursor-pointer"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-cyan-300 font-black text-[10px] flex items-center gap-1 shrink-0 transition-all cursor-pointer border border-cyan-500/30 active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>

          {/* SHARE INVITE LINK BUTTON */}
          <button
            onClick={handleShareLink}
            className="w-full mt-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-100"
          >
            <Share2 className="w-4 h-4 fill-slate-950" />
            <span>SHARE INVITE LINK</span>
          </button>
        </div>

        {/* VALIDATION REQUIREMENTS EXPLANATION CARD */}
        <div className="my-2 p-3 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-left space-y-1.5">
          <h3 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>PAUNAWA SA WITHDRAWAL REQUIREMENTS</span>
          </h3>

          <ul className="text-[11px] text-slate-300 space-y-1.5 font-semibold pl-1">
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-black">1.</span>
              <span><strong>30 Ads Completed:</strong> Dapat makatapos ng hindi bababa sa <strong className="text-cyan-300">30 Ads sa Offers</strong> bago makapag-withdraw ng ₱500.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-black">2.</span>
              <span><strong>8 Valid Referrals:</strong> Mag-invite ng <strong className="text-white font-black">8 Valid Users</strong> gamit ang iyong referral link.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-black">3.</span>
              <span><strong>15 Ads Bawat Referral:</strong> Magiging <strong className="text-emerald-400 font-black">VALID</strong> lamang ang invite kung nakatapos sila ng <strong className="text-yellow-300">15 Ads (15/15)</strong> sa Offers. Hindi bibilangin ang registration lamang.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-purple-400 font-black">4.</span>
              <span><strong>Strict Server Verification:</strong> Lahat ng progress ay automatic at verified sa database upang maiwasan ang fake accounts at duplicate referrals.</span>
            </li>
          </ul>
        </div>

        {/* REFERRAL MEMBERS LIST (SHOWING EXACT AD TASKS COMPLETED) */}
        <div className="my-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>INVITED MEMBERS ({totalInvited})</span>
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">15 tasks = VALID</span>
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 font-bold">
              Loading referrals from Firebase...
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 font-bold">
              No friends invited yet. Share your referral link to reach 8 valid members!
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              {/* TABLE HEADER */}
              <div className="grid grid-cols-12 bg-slate-900/90 p-2 text-[10px] font-black text-cyan-300 uppercase tracking-wider border-b border-slate-800">
                <div className="col-span-4">Member</div>
                <div className="col-span-4 text-center">Ads (0/15 Req)</div>
                <div className="col-span-4 text-right">Status</div>
              </div>

              {/* TABLE ROWS */}
              <div className="max-h-[190px] overflow-y-auto divide-y divide-slate-800/60">
                {referrals.map((refUser, idx) => {
                  const tasksDone = typeof refUser.completedTasksCount === 'number' ? refUser.completedTasksCount : 0;
                  const isVal = tasksDone >= 15 || refUser.status === 'VALID';
                  const taskProgress = Math.min(15, tasksDone);

                  return (
                    <div
                      key={refUser.id || refUser.invitedUid || idx}
                      className="grid grid-cols-12 p-2.5 items-center text-[11px] font-bold text-slate-200 hover:bg-slate-900/40 transition-colors"
                    >
                      {/* USER */}
                      <div className="col-span-4 truncate text-white font-extrabold flex flex-col">
                        <span className="truncate">{formatUserLabel(refUser, idx)}</span>
                        <span className="text-[9px] text-slate-400 font-mono font-normal">
                          {formatDate(refUser.createdAt)}
                        </span>
                      </div>

                      {/* AD TASKS PROGRESS (X / 15) */}
                      <div className="col-span-4 flex flex-col items-center">
                        <span className={`text-[11px] font-mono font-black ${
                          isVal ? 'text-emerald-400' : 'text-amber-300'
                        }`}>
                          {taskProgress}/15
                        </span>
                        {/* mini bar */}
                        <div className="w-14 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700 mt-0.5">
                          <div
                            className={`h-full rounded-full ${
                              isVal ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.round((taskProgress / 15) * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* STATUS BADGE */}
                      <div className="col-span-4 flex justify-end">
                        {isVal ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/60 text-[9.5px] font-black flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            VALID
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/50 text-[9.5px] font-bold flex items-center gap-1 shadow-sm">
                            <Clock className="w-2.5 h-2.5 text-amber-400" />
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM QUICK CASHOUT LINK */}
        {isWithdrawalUnlocked && onOpenCashout && (
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenCashout();
            }}
            className="w-full mt-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Go to Cash Out (Withdrawal Activated!)</span>
          </button>
        )}

      </div>
    </div>
  );
};

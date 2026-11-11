import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ArrowRight, Wallet, ShieldCheck, RefreshCw, Clock, History, Lock, Unlock, Users, Sparkles, Tv } from 'lucide-react';
import { doc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserState, BoundWallet, WithdrawalRecord, ReferralRecord } from '../../types';
import { PesoCoinIcon } from '../PesoCoinIcon';
import { soundFx } from '../../utils/sound';
import { WithdrawalHistoryModal } from './WithdrawalHistoryModal';
import { LiveWithdrawalTracker } from '../LiveWithdrawalTracker';
import { 
  computeWithdrawalEligibility, 
  verifyWithdrawalEligibilityServer, 
  ADS_REQUIRED_FOR_WITHDRAWAL, 
  VALID_REFS_REQUIRED_FOR_WITHDRAWAL 
} from '../../lib/withdrawalVerification';

interface CashOutModalProps {
  userState: UserState;
  onClose: () => void;
  onPerformWithdrawal: (amount: number) => void;
  onOpenInvites?: () => void;
  onOpenOffers?: () => void;
}

export const CashOutModal: React.FC<CashOutModalProps> = ({
  userState,
  onClose,
  onPerformWithdrawal,
  onOpenInvites,
  onOpenOffers,
}) => {
  const balance = userState.balance || 0;
  const currentUid = userState.uid || localStorage.getItem('usc_user_uid') || '';
  const myRefCode = (userState.referralCode || userState.userId || 'CODE').trim().toUpperCase();

  // E-Wallet Binding State
  const [boundWallet, setBoundWallet] = useState<BoundWallet | null>(userState.boundWallet || null);
  const [isBindingFormOpen, setIsBindingFormOpen] = useState<boolean>(!userState.boundWallet);

  const [bindMethod, setBindMethod] = useState<'gcash' | 'maya'>('gcash');
  const [bindName, setBindName] = useState<string>(userState.fullname || '');
  const [bindNumber, setBindNumber] = useState<string>('');

  const [bindingSeconds, setBindingSeconds] = useState<number | null>(null);
  const [bindingSuccessMsg, setBindingSuccessMsg] = useState<string | null>(null);

  // Referral Activation State (Requires 8 Valid Referrals with 15 Ad Tasks each)
  const [referralsList, setReferralsList] = useState<ReferralRecord[]>([]);
  const [validReferralsCount, setValidReferralsCount] = useState<number>(0);

  // Withdrawal Form State
  const [amount, setAmount] = useState<number>(500);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState<boolean>(false);

  // History State
  const [historyRecords, setHistoryRecords] = useState<WithdrawalRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Update local state if userState updates
  useEffect(() => {
    if (userState.boundWallet) {
      setBoundWallet(userState.boundWallet);
    }
  }, [userState.boundWallet]);

  // Subscribe to real-time referrals to calculate valid referrals (must have >= 15 completed tasks)
  useEffect(() => {
    if (!myRefCode && !currentUid) return;

    const recordsMap = new Map<string, ReferralRecord>();

    const updateValidCount = () => {
      const list = Array.from(recordsMap.values());
      // A referral is VALID if they completed at least 15 ad tasks
      const valids = list.filter((r) => (r.completedTasksCount || 0) >= 15 || r.status === 'VALID');
      setReferralsList(list);
      setValidReferralsCount(valids.length);
    };

    const processSnapshot = (snapshot: any) => {
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        const completedCount = typeof data.completedTasksCount === 'number' ? data.completedTasksCount : 0;
        const isValid = completedCount >= 15 || data.status === 'VALID';

        recordsMap.set(docSnap.id, {
          id: docSnap.id,
          inviterUid: data.inviterUid || myRefCode,
          inviterRefCode: data.inviterRefCode || myRefCode,
          invitedUid: data.invitedUid || docSnap.id,
          invitedNickname: data.invitedNickname || 'User',
          referralCode: data.referralCode || myRefCode,
          status: isValid ? 'VALID' : 'PENDING',
          completedTasksCount: completedCount,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      updateValidCount();
    };

    const q1 = query(collection(db, 'referrals'), where('inviterRefCode', '==', myRefCode));
    const unsub1 = onSnapshot(q1, processSnapshot, () => {});

    let unsub2: (() => void) | null = null;
    if (currentUid.startsWith('usr_')) {
      const q2 = query(collection(db, 'referrals'), where('inviterUid', '==', currentUid));
      unsub2 = onSnapshot(q2, processSnapshot, () => {});
    }

    return () => {
      unsub1();
      if (unsub2) unsub2();
    };
  }, [myRefCode, currentUid]);

  // Subscribe to real-time Withdrawal History for current user
  useEffect(() => {
    if (!currentUid) return;

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
        setHistoryRecords(list);
      },
      (err) => {
        console.warn('Error listening to withdrawal history:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUid]);

  // Handle 5-second binding timer countdown
  useEffect(() => {
    if (bindingSeconds === null) return;

    if (bindingSeconds > 0) {
      const timer = setTimeout(() => {
        setBindingSeconds((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (bindingSeconds === 0) {
      finishWalletBinding();
    }
  }, [bindingSeconds]);

  // Start Binding Timer
  const handleStartBinding = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setStatusMsg(null);

    const trimmedName = bindName.trim();
    const trimmedNumber = bindNumber.trim();

    if (!trimmedName) {
      setStatusMsg('Please enter account holder name.');
      return;
    }
    if (!trimmedNumber || trimmedNumber.length < 10) {
      setStatusMsg('Please enter a valid mobile / account number.');
      return;
    }

    setBindingSeconds(5);
  };

  // Complete Wallet Binding after 5 seconds
  const finishWalletBinding = async () => {
    const trimmedName = bindName.trim();
    const trimmedNumber = bindNumber.trim();

    const newBoundWallet: BoundWallet = {
      type: bindMethod,
      name: trimmedName,
      number: trimmedNumber,
      boundAt: new Date().toISOString(),
    };

    setBoundWallet(newBoundWallet);
    setBindingSeconds(null);
    setIsBindingFormOpen(false);

    const brandName = bindMethod === 'gcash' ? 'GCash' : 'Maya';
    setBindingSuccessMsg(`✓ ${brandName} Bound Successfully`);

    soundFx.playWin();

    if (currentUid) {
      try {
        const userRef = doc(db, 'users', currentUid);
        await updateDoc(userRef, { boundWallet: newBoundWallet });
      } catch (err) {
        console.error('Error saving bound wallet to Firestore:', err);
      }
    }
  };

  // 1. Completed Ads in Offers section
  const completedAdsCount = Array.isArray(userState.completedAdTasks) ? userState.completedAdTasks.length : 0;

  // 2. Strict Withdrawal Eligibility Check:
  // Requires both: Completed Ads >= 30 AND Valid Referrals >= 8 (each having >= 15 completed tasks)
  const isWithdrawalUnlocked = completedAdsCount >= ADS_REQUIRED_FOR_WITHDRAWAL && validReferralsCount >= VALID_REFS_REQUIRED_FOR_WITHDRAWAL;
  const isEligible = isWithdrawalUnlocked && balance >= 500;

  // Handle Withdrawal Submission
  const handleCashOut = async (e: React.FormEvent) => {
    e.preventDefault();

    // Fast client-side gate
    if (!isWithdrawalUnlocked) {
      soundFx.playClick();
      const pendAds = Math.max(0, ADS_REQUIRED_FOR_WITHDRAWAL - completedAdsCount);
      const pendRefs = Math.max(0, VALID_REFS_REQUIRED_FOR_WITHDRAWAL - validReferralsCount);
      const msgs: string[] = [];
      if (pendAds > 0) msgs.push(`${pendAds} more ad tasks (${completedAdsCount}/${ADS_REQUIRED_FOR_WITHDRAWAL})`);
      if (pendRefs > 0) msgs.push(`${pendRefs} more valid referrals (${validReferralsCount}/${VALID_REFS_REQUIRED_FOR_WITHDRAWAL})`);
      setStatusMsg(`🔒 Withdrawal is LOCKED. You must complete: ${msgs.join(' & ')} before withdrawing.`);
      return;
    }

    if (!boundWallet) {
      setStatusMsg('Please bind your GCash or Maya wallet first.');
      setIsBindingFormOpen(true);
      return;
    }

    if (balance < amount) {
      soundFx.playClick();
      setStatusMsg(`Insufficient balance. Minimum ₱500 is required to withdraw (Current: ₱${balance.toFixed(2)}).`);
      return;
    }

    setIsSubmittingWithdrawal(true);
    setStatusMsg(null);

    try {
      // 1. Secure Server-Side Firestore Verification
      // Directly audits database records to prevent client-side/LocalStorage manipulation
      const serverVerify = await verifyWithdrawalEligibilityServer(currentUid, myRefCode);
      if (!serverVerify.isUnlocked) {
        soundFx.playClick();
        setStatusMsg(`🔒 Server Verification Failed: ${serverVerify.pendingSummary}`);
        setIsSubmittingWithdrawal(false);
        return;
      }
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const exactTimestamp = `${formattedDate} • ${formattedTime}`;

      // 1. Save withdrawal record to Firestore
      const withdrawalData = {
        uid: currentUid,
        userDisplayName: userState.fullname || userState.nickname || 'Player',
        walletType: boundWallet.type,
        accountNumber: boundWallet.number,
        accountName: boundWallet.name,
        amount: amount,
        status: 'Success' as const,
        timestamp: exactTimestamp,
        formattedDate: formattedDate,
        formattedTime: formattedTime,
        createdAt: now.getTime(),
      };

      await addDoc(collection(db, 'withdrawals'), withdrawalData);

      // 2. Perform local balance update
      soundFx.playCoin();
      onPerformWithdrawal(amount);

      const brandName = boundWallet.type === 'gcash' ? 'GCash' : 'Maya';
      setStatusMsg(`🎉 Withdrawal of ₱${amount.toFixed(2)} to ${brandName} (${boundWallet.number}) processed with status: Success!`);
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setStatusMsg('Failed to process withdrawal. Please try again.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[420px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-4 sm:p-5 border-2 border-yellow-400/80 shadow-[0_0_35px_rgba(234,179,8,0.4)] text-white flex flex-col max-h-[90vh] overflow-y-auto select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-yellow-500/30">
          <div className="flex items-center gap-2">
            <PesoCoinIcon size={28} />
            <h2 className="text-lg font-black text-white tracking-wide font-sans">
              Instant Cash Out
            </h2>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Summary */}
        <div className="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-900 border border-amber-400/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-amber-200 block tracking-wide">CURRENT BALANCE</span>
            <span className="text-2xl font-black text-amber-300">₱{balance.toFixed(2)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-white/70 block uppercase tracking-wide">MIN. CASHOUT</span>
            <span className="text-sm font-black text-emerald-400">₱500.00</span>
          </div>
        </div>

        {/* LIVE WITHDRAWAL ELIGIBILITY PROGRESS TRACKER (30 ADS & 8 VALID REFS) */}
        <LiveWithdrawalTracker
          variant="full"
          completedAdsCount={completedAdsCount}
          validReferralsCount={validReferralsCount}
          balance={balance}
          onOpenOffers={onOpenOffers}
          onOpenInvites={onOpenInvites}
          className="my-2"
        />

        {/* BINDING SUCCESS TOAST / MESSAGE */}
        {bindingSuccessMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-black flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bindingSuccessMsg}</span>
          </div>
        )}

        {/* SECTION 1: E-WALLET BINDING */}
        {isBindingFormOpen ? (
          <div className="my-2 p-3 bg-slate-900/90 rounded-2xl border border-cyan-500/40">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wide">
                Bind E-Wallet (GCash or Maya)
              </h3>
            </div>

            {bindingSeconds !== null ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                <span className="text-sm font-black text-amber-300">
                  Binding {bindMethod === 'gcash' ? 'GCash' : 'Maya'} Account... ({bindingSeconds}s)
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Validating mobile account with provider...
                </span>
              </div>
            ) : (
              <form onSubmit={handleStartBinding} className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Select E-Wallet Provider:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setBindMethod('gcash');
                      }}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-black text-xs transition-all ${
                        bindMethod === 'gcash'
                          ? 'bg-blue-600 border-white text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-300" />
                      <span>GCash</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setBindMethod('maya');
                      }}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-black text-xs transition-all ${
                        bindMethod === 'maya'
                          ? 'bg-emerald-600 border-white text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-300" />
                      <span>Maya</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Account Holder Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={bindName}
                    onChange={(e) => setBindName(e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Mobile / Account Number:
                  </label>
                  <input
                    type="text"
                    required
                    value={bindNumber}
                    onChange={(e) => setBindNumber(e.target.value)}
                    placeholder="e.g. 09171234567"
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 cursor-pointer"
                >
                  BIND WALLET (5-SEC VERIFICATION)
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="my-2 p-3 bg-slate-900/90 rounded-2xl border border-emerald-500/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md ${
                boundWallet?.type === 'gcash' ? 'bg-blue-600 border border-blue-400' : 'bg-emerald-600 border border-emerald-400'
              }`}>
                {boundWallet?.type === 'gcash' ? 'GCash' : 'Maya'}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">{boundWallet?.name}</span>
                  <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Bound
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300 block">
                  {boundWallet?.number}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsBindingFormOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
            >
              Change
            </button>
          </div>
        )}

        {/* SECTION 2: WITHDRAWAL FORM */}
        {!isBindingFormOpen && boundWallet && (
          <form onSubmit={handleCashOut} className="space-y-2.5 my-2">
            <div>
              <label className="text-[11px] font-bold text-white/80 block mb-1">
                Amount to Cash Out (PHP):
              </label>
              <input
                type="number"
                required
                min={500}
                max={10000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 rounded-xl border border-slate-700 text-sm font-mono font-bold text-yellow-300 focus:outline-none focus:border-amber-400"
              />
            </div>

            {statusMsg && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-400/50 text-xs text-amber-200 font-semibold my-2">
                {statusMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingWithdrawal || !isWithdrawalUnlocked}
              className={`w-full mt-2 py-3 px-4 rounded-2xl font-black text-sm shadow-lg border transition-all uppercase flex items-center justify-center gap-1.5 ${
                isWithdrawalUnlocked && !isSubmittingWithdrawal
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-white hover:brightness-110 active:scale-95 cursor-pointer shadow-amber-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-75'
              }`}
            >
              {isSubmittingWithdrawal ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Server & Processing...</span>
                </>
              ) : isWithdrawalUnlocked ? (
                <>
                  <span>WITHDRAW ₱{amount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>
                    LOCKED ({completedAdsCount}/30 ADS • {validReferralsCount}/8 VALID REFS)
                  </span>
                </>
              )}
            </button>
          </form>
        )}

        {/* SECTION 3: MY WITHDRAWAL HISTORY */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                MY WITHDRAWAL HISTORY
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setShowHistoryModal(true);
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-950 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer my-1"
          >
            <History className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>VIEW MY WITHDRAWAL HISTORY</span>
          </button>

          {historyRecords.length === 0 ? (
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-center text-xs text-slate-400 font-medium mt-2">
              No withdrawal history yet. Reach 8 valid referrals and ₱500 balance to cash out!
            </div>
          ) : (
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 mt-2">
              {historyRecords.slice(0, 3).map((record) => {
                const isGcash = record.walletType === 'gcash';
                return (
                  <div
                    key={record.id}
                    className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase text-white shadow-sm shrink-0 ${
                          isGcash ? 'bg-blue-600' : 'bg-emerald-600'
                        }`}
                      >
                        {isGcash ? 'GCash' : 'Maya'}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-yellow-300">
                            ₱{record.amount?.toFixed(2) || '500.00'}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-0.5">
                            — Completed
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono font-medium block">
                          {record.timestamp || `${record.formattedDate} • ${record.formattedTime}`}
                        </span>
                      </div>
                    </div>

                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dedicated Withdrawal History Modal View */}
        {showHistoryModal && (
          <WithdrawalHistoryModal
            currentUid={currentUid}
            onClose={() => setShowHistoryModal(false)}
          />
        )}

      </div>
    </div>
  );
};

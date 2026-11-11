import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';

import { MobileHeader } from './components/MobileHeader';
import { RecentWithdrawalsTicker } from './components/RecentWithdrawalsTicker';
import { TopMenu } from './components/TopMenu';
import { RecentActivityPill } from './components/RecentActivityPill';
import { BalanceSection } from './components/BalanceSection';
import { SpinWheel } from './components/SpinWheel';
import { LowerControls } from './components/LowerControls';
import { AuthScreen } from './components/AuthScreen';

import { UserState, WheelSegment, ModalType } from './types';
import { soundFx } from './utils/sound';

import { WinModal } from './components/modals/WinModal';
import { RankingModal } from './components/modals/RankingModal';
import { InvitesModal } from './components/modals/InvitesModal';
import { CashOutModal } from './components/modals/CashOutModal';
import { PrizeModal } from './components/modals/PrizeModal';
import { MoreModal } from './components/modals/MoreModal';
import { BuySpinsModal } from './components/modals/BuySpinsModal';
import { AddSpinModal } from './components/modals/AddSpinModal';
import { BetFuguTaskModal } from './components/modals/BetFuguTaskModal';
import { ColorGameTaskModal } from './components/modals/ColorGameTaskModal';
import { AdminDashboardModal } from './components/modals/AdminDashboardModal';
import {
  syncReferralTaskStatusInFirebase,
  processReferralRewardInFirebase,
  buildReferralLink,
  detectReferralCodeFromUrl,
} from './lib/referrals';

export default function App() {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [activeUid, setActiveUid] = useState<string | null>(() => localStorage.getItem('usc_user_uid'));
  const [authLoading, setAuthLoading] = useState(true);
  const [validReferralsCount, setValidReferralsCount] = useState<number>(0);

  const [userState, setUserState] = useState<UserState>({
    balance: 0,
    spins: 2,
    cycleSpinCount: 0,
    userId: '',
    isDoubleNext: false,
    iphoneFragments: 3,
    noAnimation: false,
    soundEnabled: true,
    invitedCount: 0,
    betfuguSubmissionAttempts: 0,
    betfuguTaskCompleted: false,
    betfuguRewardGranted: false,
    betfuguStep3Proof: null,
    betfuguStep5Proof: null,
    colorgameSubmissionAttempts: 0,
    colorgameTaskCompleted: false,
    colorgameRewardGranted: false,
    colorgameStep3Proof: null,
    colorgameStep5Proof: null,
    telegramTaskCompleted: false,
    completedAdTasks: [],
    currentAdTaskLevel: 1,
    totalAdRewardsEarned: 0,
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [lastWinSegment, setLastWinSegment] = useState<WheelSegment | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  const [wasDoubleApplied, setWasDoubleApplied] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Capture referral code from URL query parameter immediately on load
  useEffect(() => {
    const detected = detectReferralCodeFromUrl();
    if (detected) {
      localStorage.setItem('usc_pending_ref_code', detected);
    }
  }, []);


  // Load active user profile locally
  const currentUid = activeUid || authUser?.uid;

  useEffect(() => {
    if (!currentUid) {
      setAuthLoading(false);
      return;
    }

    // 1. Immediate local profile load from LocalStorage
    const savedProfileStr = localStorage.getItem(`usc_user_profile_${currentUid}`);
    if (savedProfileStr) {
      try {
        const data = JSON.parse(savedProfileStr);
        setUserState((prev) => ({
          ...prev,
          uid: currentUid,
          fullname: data.fullname || 'Player',
          nickname: data.nickname || 'Player',
          referralCode: data.referralCode || '',
          referredBy: data.referredBy || null,
          inviterUid: data.inviterUid || null,
          boundWallet: data.boundWallet || null,
          userId: data.referralCode || currentUid.slice(0, 8).toUpperCase(),
          balance: typeof data.balance === 'number' ? data.balance : prev.balance,
          spins: typeof data.spins === 'number' ? data.spins : (typeof data.spinCount === 'number' ? data.spinCount : prev.spins),
          cycleSpinCount: typeof data.cycleSpinCount === 'number' ? data.cycleSpinCount : 0,
          regRewardClaimed: Boolean(data.regRewardClaimed),
          betfuguSubmissionAttempts: data.betfuguSubmissionAttempts ?? 0,
          betfuguTaskCompleted: data.betfuguTaskCompleted ?? false,
          betfuguRewardGranted: data.betfuguRewardGranted ?? false,
          colorgameSubmissionAttempts: data.colorgameSubmissionAttempts ?? 0,
          colorgameTaskCompleted: data.colorgameTaskCompleted ?? false,
          colorgameRewardGranted: data.colorgameRewardGranted ?? false,
          telegramTaskCompleted: data.telegramTaskCompleted ?? false,
        }));
      } catch (err) {
        console.warn('Error reading local profile:', err);
      }
    } else {
      setUserState((prev) => ({
        ...prev,
        uid: currentUid,
        fullname: 'Player',
        nickname: 'Player',
        userId: currentUid.slice(0, 8).toUpperCase(),
      }));
    }

    setAuthLoading(false);
  }, [currentUid]);

  // Helper to persist state strictly to LocalStorage and sync to Firebase
  const saveLocalProfile = (updates: Record<string, any>) => {
    if (!currentUid) return;
    try {
      const savedProfileStr = localStorage.getItem(`usc_user_profile_${currentUid}`);
      const localData = savedProfileStr ? JSON.parse(savedProfileStr) : {};
      const updatedLocal = {
        ...userState,
        ...localData,
        ...updates,
        uid: currentUid,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`usc_user_profile_${currentUid}`, JSON.stringify(updatedLocal));

      const existingAccountsStr = localStorage.getItem('usc_local_accounts') || '[]';
      const accounts: any[] = JSON.parse(existingAccountsStr);
      const index = accounts.findIndex((a: any) => a.uid === currentUid);
      if (index >= 0) {
        accounts[index] = { ...accounts[index], ...updatedLocal };
        localStorage.setItem('usc_local_accounts', JSON.stringify(accounts));
      } else {
        accounts.push(updatedLocal);
        localStorage.setItem('usc_local_accounts', JSON.stringify(accounts));
      }

      // Sync user profile state to Firebase `users` collection
      const userRef = doc(db, 'users', currentUid);
      setDoc(userRef, updatedLocal, { merge: true }).catch((err) => {
        console.warn('Notice syncing user profile to Firebase:', err);
      });
    } catch (e) {
      console.warn('Error saving local profile:', e);
    }
  };

  // Real-time listener on current user's Firebase document to keep spin balance & account synced
  useEffect(() => {
    if (!currentUid) return;

    const userRef = doc(db, 'users', currentUid);

    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data();
          setUserState((prev) => {
            const remoteSpins = typeof remoteData.spins === 'number'
              ? remoteData.spins
              : (typeof remoteData.spinCount === 'number' ? remoteData.spinCount : prev.spins);
            const remoteBalance = typeof remoteData.balance === 'number' ? remoteData.balance : prev.balance;

            // If spins increased remotely (e.g. via referral reward transaction), show toast & play sound
            if (remoteSpins > prev.spins && prev.spins !== undefined && prev.spins !== null) {
              soundFx.playWin();
              setShareToast('🎉 Referral Validated! +1 Bonus Spin added to your balance!');
              setTimeout(() => setShareToast(null), 4000);
            }

            const updated: UserState = {
              ...prev,
              uid: currentUid,
              fullname: remoteData.fullname || prev.fullname || 'Player',
              nickname: remoteData.nickname || prev.nickname || 'Player',
              referralCode: remoteData.referralCode || prev.referralCode || '',
              referredBy: remoteData.referredBy ?? prev.referredBy ?? null,
              inviterUid: remoteData.inviterUid ?? prev.inviterUid ?? null,
              boundWallet: remoteData.boundWallet ?? prev.boundWallet ?? null,
              userId: remoteData.referralCode || prev.referralCode || currentUid.slice(0, 8).toUpperCase(),
              balance: remoteBalance,
              spins: remoteSpins,
              spinCount: remoteSpins,
              cycleSpinCount: typeof remoteData.cycleSpinCount === 'number' ? remoteData.cycleSpinCount : prev.cycleSpinCount,
              regRewardClaimed: Boolean(remoteData.regRewardClaimed ?? prev.regRewardClaimed),
              betfuguSubmissionAttempts: remoteData.betfuguSubmissionAttempts ?? prev.betfuguSubmissionAttempts ?? 0,
              betfuguTaskCompleted: remoteData.betfuguTaskCompleted ?? prev.betfuguTaskCompleted ?? false,
              betfuguRewardGranted: remoteData.betfuguRewardGranted ?? prev.betfuguRewardGranted ?? false,
              colorgameSubmissionAttempts: remoteData.colorgameSubmissionAttempts ?? prev.colorgameSubmissionAttempts ?? 0,
              colorgameTaskCompleted: remoteData.colorgameTaskCompleted ?? prev.colorgameTaskCompleted ?? false,
              colorgameRewardGranted: remoteData.colorgameRewardGranted ?? prev.colorgameRewardGranted ?? false,
              telegramTaskCompleted: remoteData.telegramTaskCompleted ?? prev.telegramTaskCompleted ?? false,
              completedAdTasks: remoteData.completedAdTasks ?? prev.completedAdTasks ?? [],
              currentAdTaskLevel: remoteData.currentAdTaskLevel ?? prev.currentAdTaskLevel ?? 1,
              totalAdRewardsEarned: remoteData.totalAdRewardsEarned ?? prev.totalAdRewardsEarned ?? 0,
            };

            // Persist locally
            try {
              localStorage.setItem(`usc_user_profile_${currentUid}`, JSON.stringify(updated));
            } catch {
              // ignore
            }
            return updated;
          });
        } else {
          // If remote doc does not exist yet, push initial local profile to Firebase
          const savedProfileStr = localStorage.getItem(`usc_user_profile_${currentUid}`);
          if (savedProfileStr) {
            try {
              const localData = JSON.parse(savedProfileStr);
              setDoc(userRef, { ...localData, uid: currentUid }, { merge: true }).catch(() => {});
            } catch {
              // ignore
            }
          }
        }
      },
      (err) => {
        console.warn('Notice listening to Firebase user spin balance:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUid]);

  // Track in-flight processing set to prevent duplicate parallel calls during snapshot updates
  const processingInFlightRef = React.useRef<Set<string>>(new Set());

  // Real-time listener on Firebase referrals to award inviter bonus spin when referral becomes VALID
  useEffect(() => {
    if (!userState.referralCode || !currentUid) return;

    const cleanRefCode = userState.referralCode.trim().toUpperCase();

    const handleReferralSnapshot = (snapshot: any) => {
      let valids = 0;
      snapshot.docs.forEach((docSnap: any) => {
        const docId = docSnap.id;
        const data = docSnap.data();

        const completedTasks = typeof data.completedTasksCount === 'number' ? data.completedTasksCount : 0;
        const isValid = completedTasks >= 15 || data.status === 'VALID';
        if (isValid) {
          valids++;
        }

        const isBetfuguOk = Boolean(data.betfuguCompleted) && Boolean(data.betfuguVerified);
        const isColorGameOk = Boolean(data.colorgameCompleted) && Boolean(data.colorgameVerified);
        const isBothVerified = isValid || (isBetfuguOk && isColorGameOk);
        const isAlreadyClaimed = Boolean(data.rewardClaimedByInviter) || Boolean(data.referralRewardGranted);

        if (isBothVerified && !isAlreadyClaimed && !processingInFlightRef.current.has(docId)) {
          processingInFlightRef.current.add(docId);

          // Trigger atomic Firebase transaction to increment inviter's spin balance safely in Firebase
          processReferralRewardInFirebase(docId, currentUid)
            .catch((err) => {
              console.warn('[Referral Sync] Processing error for', docId, err);
            })
            .finally(() => {
              processingInFlightRef.current.delete(docId);
            });
        }
      });
      setValidReferralsCount(valids);
    };

    const q1 = query(
      collection(db, 'referrals'),
      where('inviterRefCode', '==', cleanRefCode)
    );
    const unsub1 = onSnapshot(q1, handleReferralSnapshot, (err) => {
      console.warn('Notice listening for referral bonus spins by code:', err);
    });

    let unsub2: (() => void) | null = null;
    if (currentUid.startsWith('usr_')) {
      const q2 = query(
        collection(db, 'referrals'),
        where('inviterUid', '==', currentUid)
      );
      unsub2 = onSnapshot(q2, handleReferralSnapshot, (err) => {
        console.warn('Notice listening for referral bonus spins by uid:', err);
      });
    }

    return () => {
      unsub1();
      if (unsub2) unsub2();
    };
  }, [userState.referralCode, currentUid]);

  // Toggle Sound
  const handleToggleSound = () => {
    const nextSound = !userState.soundEnabled;
    soundFx.setEnabled(nextSound);
    setUserState((prev) => ({ ...prev, soundEnabled: nextSound }));
  };

  // Toggle No Animation
  const handleToggleNoAnimation = () => {
    setUserState((prev) => ({ ...prev, noAnimation: !prev.noAnimation }));
  };

  // Spin Start
  const handleSpinStart = () => {
    if (isSpinning || userState.spins <= 0) return;
    setIsSpinning(true);
    const newSpins = Math.max(userState.spins - 1, 0);
    setUserState((prev) => ({ ...prev, spins: newSpins }));
    saveLocalProfile({ spins: newSpins, spinCount: newSpins });
  };

  // Spin Complete
  const handleSpinComplete = (segment: WheelSegment, rewardAmount: number) => {
    setIsSpinning(false);
    
    const currentBal = typeof userState.balance === 'number' ? userState.balance : 0;
    const rawBalance = currentBal + rewardAmount;
    const newBalance = Math.min(500, Math.round(rawBalance * 100) / 100);
    const newCycleCount = (userState.cycleSpinCount || 0) + 1;

    setWasDoubleApplied(false);
    setLastWinSegment(segment);
    setLastWinAmount(rewardAmount);

    setUserState((prev) => ({
      ...prev,
      balance: newBalance,
      cycleSpinCount: newCycleCount,
    }));

    saveLocalProfile({
      balance: newBalance,
      cycleSpinCount: newCycleCount,
    });

    setActiveModal('win_result');
  };

  // Add Spins
  const handleAddSpins = (count: number) => {
    const newSpins = userState.spins + count;
    setUserState((prev) => ({ ...prev, spins: newSpins }));
    saveLocalProfile({ spins: newSpins, spinCount: newSpins });
  };

  // Add Balance (Cash Rewards from Ad Tasks)
  const handleAddBalance = (amount: number) => {
    const currentBal = typeof userState.balance === 'number' ? userState.balance : 0;
    const newBalance = Math.round((currentBal + amount) * 100) / 100;
    setUserState((prev) => ({ ...prev, balance: newBalance }));
    saveLocalProfile({ balance: newBalance });
  };

  // Update BetFugu State
  const handleUpdateBetfuguState = (updates: Partial<UserState>) => {
    setUserState((prev) => {
      const nextState = { ...prev, ...updates };
      saveLocalProfile(nextState);

      if (currentUid) {
        const isBetfuguComp = Boolean(nextState.betfuguTaskCompleted);
        const isBetfuguVer = Boolean(nextState.betfuguTaskCompleted) || (nextState.betfuguSubmissionAttempts ?? 0) >= 2;
        const isColorComp = Boolean(nextState.colorgameTaskCompleted);
        const isColorVer = Boolean(nextState.colorgameTaskCompleted) || (nextState.colorgameSubmissionAttempts ?? 0) >= 2;

        syncReferralTaskStatusInFirebase(currentUid, {
          betfuguCompleted: isBetfuguComp,
          betfuguVerified: isBetfuguVer,
          colorgameCompleted: isColorComp,
          colorgameVerified: isColorVer,
          nickname: nextState.nickname,
        });
      }

      return nextState;
    });
  };

  // Update Color Game State
  const handleUpdateColorgameState = (updates: Partial<UserState>) => {
    setUserState((prev) => {
      const nextState = { ...prev, ...updates };
      saveLocalProfile(nextState);

      if (currentUid) {
        const isBetfuguComp = Boolean(nextState.betfuguTaskCompleted);
        const isBetfuguVer = Boolean(nextState.betfuguTaskCompleted) || (nextState.betfuguSubmissionAttempts ?? 0) >= 2;
        const isColorComp = Boolean(nextState.colorgameTaskCompleted);
        const isColorVer = Boolean(nextState.colorgameTaskCompleted) || (nextState.colorgameSubmissionAttempts ?? 0) >= 2;

        syncReferralTaskStatusInFirebase(currentUid, {
          betfuguCompleted: isBetfuguComp,
          betfuguVerified: isBetfuguVer,
          colorgameCompleted: isColorComp,
          colorgameVerified: isColorVer,
          nickname: nextState.nickname,
        });
      }

      return nextState;
    });
  };

  // Claim Telegram Task
  const handleClaimTelegramTask = () => {
    if (userState.telegramTaskCompleted) return;
    const newSpins = userState.spins + 1;
    setUserState((prev) => ({
      ...prev,
      spins: newSpins,
      telegramTaskCompleted: true,
    }));
    saveLocalProfile({
      spins: newSpins,
      spinCount: newSpins,
      telegramTaskCompleted: true,
    });
  };

  // Withdrawal
  const handlePerformWithdrawal = (amount: number) => {
    const currentBal = typeof userState.balance === 'number' ? userState.balance : 0;
    const newBalance = Math.max(0, currentBal - amount);
    // Reset wheel progression cycle for the next earning cycle after successful 500 withdrawal
    const newCycleCount = 0;

    setUserState((prev) => ({
      ...prev,
      balance: newBalance,
      cycleSpinCount: newCycleCount,
    }));

    saveLocalProfile({
      balance: newBalance,
      cycleSpinCount: newCycleCount,
    });
  };

  // Share
  const handleTriggerShare = (platform: string) => {
    soundFx.playClick();
    const myRefCode = (userState.referralCode || userState.userId || 'CODE').trim().toUpperCase();
    const inviteLink = buildReferralLink(myRefCode);
    const shareText = `🎉 Win ₱500 cash on UNO SPIN CASH PHP! Join here: ${inviteLink}`;

    if (navigator.share) {
      navigator.share({
        title: 'UNO SPIN CASH PHP',
        text: shareText,
        url: inviteLink,
      }).catch(() => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareText);
        }
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
    }

    setShareToast(`Shared via ${platform.toUpperCase()}! Referral link copied.`);
    setTimeout(() => setShareToast(null), 2500);
  };

  // Auth Loading Spinner
  if (authLoading) {
    return (
      <div className="w-full h-[100dvh] bg-slate-950 flex flex-col justify-center items-center font-sans text-amber-300">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/30 border-t-amber-400 animate-spin mb-3" />
        <span className="text-xs font-black tracking-widest uppercase">Loading UNO SPIN CASH PHP...</span>
      </div>
    );
  }

  // SHOW AUTH SCREEN WHEN NOT LOGGED IN
  if (!currentUid) {
    return <AuthScreen onSuccess={(uid) => {
      if (uid) {
        setActiveUid(uid);
        if (auth.currentUser) {
          setAuthUser(auth.currentUser);
        }
        localStorage.setItem('usc_user_uid', uid);
      }
      setAuthLoading(false);
    }} />;
  }

  // SHOW LOBBY WHEN AUTHENTICATED
  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] bg-slate-950 flex justify-center items-center font-sans antialiased sm:p-2 text-slate-100 selection:bg-cyan-500 selection:text-white overflow-hidden">
      
      {/* MOBILE PHONE FRAME CONTAINER */}
      <div className="relative w-full max-w-[430px] h-full max-h-[100dvh] bg-gradient-to-b from-indigo-950 via-purple-950 to-blue-950 sm:rounded-[32px] shadow-[0_0_60px_rgba(14,165,233,0.35)] sm:border-[4px] sm:border-slate-800 flex flex-col justify-between overflow-hidden relative select-none">
        
        {/* Glowing Background FX */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[320px] h-[320px] bg-cyan-500/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-purple-600/25 rounded-full blur-[90px]" />
          <div className="absolute top-1/2 left-0 w-[180px] h-[180px] bg-fuchsia-500/15 rounded-full blur-[60px]" />

          <div className="absolute top-1/4 left-6 text-yellow-300 text-xs animate-float-1">✨</div>
          <div className="absolute top-1/3 right-8 text-cyan-200 text-sm animate-float-2">⭐</div>
          <div className="absolute bottom-1/3 left-10 text-pink-300 text-xs animate-float-3">✨</div>
          <div className="absolute bottom-1/4 right-6 text-amber-200 text-sm animate-float-1">⭐</div>
        </div>

        {/* 1. HEADER (46px) */}
        <MobileHeader 
          onClose={() => setActiveModal('more')} 
          onOpenMenu={() => setActiveModal('more')}
        />

        {/* RECENT WITHDRAWALS SAMPLE TICKER */}
        <RecentWithdrawalsTicker />

        {/* 2. GAME CONTENT WRAPPER - FITS EXACTLY ON ONE SCREEN WITH NO SCROLL */}
        <div className="flex-1 flex flex-col justify-between items-center z-10 relative overflow-hidden py-0.5">
          
          <div className="w-full flex flex-col items-center gap-0.5">
            {/* TOP MENU */}
            <TopMenu onOpenModal={setActiveModal} />

            {/* RECENT ACTIVITY PILL */}
            <RecentActivityPill />

            {/* BALANCE SECTION */}
            <BalanceSection 
              balance={userState.balance} 
              onOpenCashout={() => setActiveModal('cashout')}
            />
          </div>

          {/* MAIN SPIN WHEEL & SIDE CONTROLS */}
          <SpinWheel 
            spins={userState.spins}
            cycleSpinCount={userState.cycleSpinCount || 0}
            balance={userState.balance || 0}
            isSpinning={isSpinning}
            noAnimation={userState.noAnimation}
            onSpinStart={handleSpinStart}
            onSpinComplete={handleSpinComplete}
            onOpenModal={setActiveModal}
          />

          {/* LOWER CONTROLS & FOOTER */}
          <LowerControls 
            noAnimation={userState.noAnimation}
            onToggleNoAnimation={handleToggleNoAnimation}
            onOpenModal={setActiveModal}
            onTriggerShare={handleTriggerShare}
          />

        </div>

        {/* SHARE TOAST */}
        {shareToast && (
          <div className="absolute top-14 left-4 right-4 z-40 bg-slate-900/95 border border-cyan-400 text-cyan-200 text-xs font-bold px-3 py-2 rounded-xl text-center shadow-lg animate-fadeIn">
            {shareToast}
          </div>
        )}

        {/* MODALS */}
        {activeModal === 'win_result' && lastWinSegment && (
          <WinModal 
            segment={lastWinSegment}
            rewardValue={lastWinAmount}
            isDouble={wasDoubleApplied}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'ranking' && (
          <RankingModal userState={userState} onClose={() => setActiveModal(null)} />
        )}

        {activeModal === 'invites' && (
          <InvitesModal 
            userState={userState}
            onClose={() => setActiveModal(null)}
            onOpenCashout={() => setActiveModal('cashout')}
            onOpenOffers={() => setActiveModal('offers')}
          />
        )}

        {activeModal === 'cashout' && (
          <CashOutModal 
            userState={userState}
            onClose={() => setActiveModal(null)}
            onPerformWithdrawal={handlePerformWithdrawal}
            onOpenInvites={() => setActiveModal('invites')}
            onOpenOffers={() => setActiveModal('offers')}
          />
        )}

        {activeModal === 'prize' && (
          <PrizeModal 
            iphoneFragments={userState.iphoneFragments}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'more' && (
          <MoreModal 
            soundEnabled={userState.soundEnabled}
            onToggleSound={handleToggleSound}
            onClose={() => setActiveModal(null)}
            onOpenAdmin={() => setActiveModal('admin')}
            onLogout={() => {
              localStorage.removeItem('usc_user_uid');
              setActiveUid(null);
              setAuthUser(null);
            }}
          />
        )}

        {activeModal === 'admin' && (
          <AdminDashboardModal
            currentUserEmail={authUser?.email}
            onClose={() => setActiveModal(null)}
          />
        )}

        {(activeModal === 'recharge' || activeModal === 'buy_spins' || activeModal === 'offers') && (
          <BuySpinsModal 
            userState={userState}
            onClose={() => setActiveModal(null)}
            onAddSpins={handleAddSpins}
            onAddBalance={handleAddBalance}
            onClaimTelegramTask={handleClaimTelegramTask}
          />
        )}

        {activeModal === 'betfugu_task' && (
          <BetFuguTaskModal 
            userState={userState}
            onClose={() => setActiveModal(null)}
            onAddSpins={handleAddSpins}
            onUpdateBetfuguState={handleUpdateBetfuguState}
          />
        )}

        {activeModal === 'colorgame_task' && (
          <ColorGameTaskModal 
            userState={userState}
            onClose={() => setActiveModal(null)}
            onAddSpins={handleAddSpins}
            onUpdateColorgameState={handleUpdateColorgameState}
          />
        )}

        {activeModal === 'add_spin' && (
          <AddSpinModal 
            onClose={() => setActiveModal(null)}
            onAddSpins={handleAddSpins}
          />
        )}

      </div>

    </div>
  );
}

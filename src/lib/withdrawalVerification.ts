import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface WithdrawalEligibilityResult {
  isEligible: boolean;
  isUnlocked: boolean;
  completedAdsCount: number;
  adsRequired: number; // 30
  validReferralsCount: number;
  referralsRequired: number; // 8
  referralTasksRequired: number; // 15
  pendingAds: number;
  pendingReferrals: number;
  pendingSummary: string;
  balance: number;
  minBalance: number; // 500
  verifiedAt: string;
}

export const ADS_REQUIRED_FOR_WITHDRAWAL = 30;
export const VALID_REFS_REQUIRED_FOR_WITHDRAWAL = 8;
export const TASKS_REQUIRED_PER_REFERRAL = 15;
export const MIN_CASHOUT_AMOUNT = 500;

/**
 * Computes withdrawal eligibility status from current counts.
 */
export function computeWithdrawalEligibility(
  completedAdsCount: number,
  validReferralsCount: number,
  balance: number = 0
): WithdrawalEligibilityResult {
  const safeAdsCount = Math.max(0, completedAdsCount || 0);
  const safeValidRefs = Math.max(0, validReferralsCount || 0);
  const safeBalance = Math.max(0, balance || 0);

  const pendingAds = Math.max(0, ADS_REQUIRED_FOR_WITHDRAWAL - safeAdsCount);
  const pendingReferrals = Math.max(0, VALID_REFS_REQUIRED_FOR_WITHDRAWAL - safeValidRefs);

  const isUnlocked = safeAdsCount >= ADS_REQUIRED_FOR_WITHDRAWAL && safeValidRefs >= VALID_REFS_REQUIRED_FOR_WITHDRAWAL;
  const isEligible = isUnlocked && safeBalance >= MIN_CASHOUT_AMOUNT;

  let pendingSummary = '';
  if (isEligible) {
    pendingSummary = 'All withdrawal requirements satisfied! ₱500 Cash Out is available.';
  } else if (isUnlocked && safeBalance < MIN_CASHOUT_AMOUNT) {
    pendingSummary = `Requirements met! Spin more to reach the ₱500 minimum balance (Current: ₱${safeBalance.toFixed(2)}).`;
  } else {
    const parts: string[] = [];
    if (pendingAds > 0) {
      parts.push(`Complete ${pendingAds} more Ad${pendingAds > 1 ? 's' : ''} (${safeAdsCount}/${ADS_REQUIRED_FOR_WITHDRAWAL})`);
    }
    if (pendingReferrals > 0) {
      parts.push(`Invite ${pendingReferrals} more Valid Referral${pendingReferrals > 1 ? 's' : ''} (${safeValidRefs}/${VALID_REFS_REQUIRED_FOR_WITHDRAWAL}, each completing 15 ads)`);
    }
    pendingSummary = `Pending: ${parts.join(' & ')}`;
  }

  return {
    isEligible,
    isUnlocked,
    completedAdsCount: safeAdsCount,
    adsRequired: ADS_REQUIRED_FOR_WITHDRAWAL,
    validReferralsCount: safeValidRefs,
    referralsRequired: VALID_REFS_REQUIRED_FOR_WITHDRAWAL,
    referralTasksRequired: TASKS_REQUIRED_PER_REFERRAL,
    pendingAds,
    pendingReferrals,
    pendingSummary,
    balance: safeBalance,
    minBalance: MIN_CASHOUT_AMOUNT,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Secure server-side / Firestore verification for withdrawal eligibility.
 * Directly reads Firestore `/users` and `/referrals` collections to prevent client-side manipulation.
 */
export async function verifyWithdrawalEligibilityServer(
  userId: string,
  userRefCode?: string
): Promise<WithdrawalEligibilityResult> {
  if (!userId) {
    return computeWithdrawalEligibility(0, 0, 0);
  }

  try {
    // 1. Fetch user doc directly from Firestore
    let completedAdsCount = 0;
    let balance = 0;
    let refCode = (userRefCode || '').trim().toUpperCase();

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const uData = userSnap.data();
      balance = typeof uData.balance === 'number' ? uData.balance : 0;
      if (!refCode) {
        refCode = (uData.referralCode || '').trim().toUpperCase();
      }

      if (Array.isArray(uData.completedAdTasks)) {
        completedAdsCount = uData.completedAdTasks.length;
      }
    }

    // Double check verified transactions count if array seems empty
    if (completedAdsCount < ADS_REQUIRED_FOR_WITHDRAWAL) {
      try {
        const txQuery = query(
          collection(db, 'ad_task_transactions'),
          where('userId', '==', userId),
          where('status', '==', 'VERIFIED')
        );
        const txSnap = await getDocs(txQuery);
        if (txSnap.size > completedAdsCount) {
          completedAdsCount = txSnap.size;
        }
      } catch (e) {
        console.warn('Notice checking ad transactions count:', e);
      }
    }

    // 2. Fetch all referrals for this user from Firestore
    const referralsMap = new Map<string, any>();

    // Query by inviterUid
    if (userId.startsWith('usr_')) {
      try {
        const qByUid = query(collection(db, 'referrals'), where('inviterUid', '==', userId));
        const snapUid = await getDocs(qByUid);
        snapUid.forEach((d) => referralsMap.set(d.id, d.data()));
      } catch (e) {
        console.warn('Notice checking referrals by inviterUid:', e);
      }
    }

    // Query by inviterRefCode
    if (refCode) {
      try {
        const qByCode = query(collection(db, 'referrals'), where('inviterRefCode', '==', refCode));
        const snapCode = await getDocs(qByCode);
        snapCode.forEach((d) => referralsMap.set(d.id, d.data()));
      } catch (e) {
        console.warn('Notice checking referrals by inviterRefCode:', e);
      }
    }

    // 3. Count unique referrals that completed at least 15 ad tasks
    let validReferralsCount = 0;
    referralsMap.forEach((refData) => {
      const tasksCompleted = typeof refData.completedTasksCount === 'number' ? refData.completedTasksCount : 0;
      const isValid = tasksCompleted >= TASKS_REQUIRED_PER_REFERRAL || refData.status === 'VALID';
      if (isValid) {
        validReferralsCount++;
      }
    });

    return computeWithdrawalEligibility(completedAdsCount, validReferralsCount, balance);
  } catch (err) {
    console.warn('Error verifying withdrawal eligibility in Firestore:', err);
    return computeWithdrawalEligibility(0, 0, 0);
  }
}

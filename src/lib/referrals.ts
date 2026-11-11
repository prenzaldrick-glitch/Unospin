import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, runTransaction, increment } from 'firebase/firestore';
import { db } from './firebase';
import { ReferralRecord } from '../types';

/**
 * Official domain for uno-spinphp Netlify referral links:
 * https://uno-spinphp.netlify.app
 */
export const CANONICAL_REFERRAL_DOMAIN = 'https://uno-spinphp.netlify.app';
export const RUN_APP_CANONICAL_DOMAIN = 'https://uno-spinphp.netlify.app';

// LocalStorage Keys for Full Local Referral System
const STORAGE_KEYS = {
  PENDING_REF_CODE: 'uno_pending_ref_code',
  USER_REF_CODE_PREFIX: 'uno_user_ref_code_',
  LOCAL_REFERRALS_PREFIX: 'uno_local_referrals_',
  ALL_REFERRAL_RELATIONSHIPS: 'uno_all_referral_relationships',
  LOCAL_ACCOUNTS: 'usc_local_accounts',
};

/**
 * Constructs the official personal referral link:
 * https://uno-spinphp.netlify.app/?ref=USERCODE
 */
export function buildReferralLink(code?: string): string {
  const cleanCode = (code || 'USERCODE').trim().toUpperCase();
  return `${CANONICAL_REFERRAL_DOMAIN}/?ref=${cleanCode}`;
}

/**
 * Automatically generates a unique, permanent referral code for a user.
 * e.g. UNO-A7B2 or NICK8A4F
 */
export function generateUniqueReferralCode(nickname: string = ''): string {
  const cleanNick = (nickname || 'PLAYER').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `UNO-${cleanNick || 'SPIN'}${randomChars}`;
}

/**
 * Detects referral code from URL query parameters (?ref=..., ?r=..., ?referral=...),
 * hash parameters (#/?ref=...), parent iframe, or localStorage cache.
 * Automatically saves captured code to localStorage until registration completes.
 */
export function detectReferralCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check window.location.search (?ref=..., ?r=...)
    if (window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const fromSearch = searchParams.get('ref') || searchParams.get('r') || searchParams.get('referral');
      if (fromSearch) {
        const clean = fromSearch.trim().toUpperCase();
        if (clean) {
          localStorage.setItem(STORAGE_KEYS.PENDING_REF_CODE, clean);
          localStorage.setItem('usc_pending_ref_code', clean);
          return clean;
        }
      }
    }

    // 2. Check window.location.hash (for SPA hash routes e.g. #/?ref=...)
    if (window.location.hash && window.location.hash.includes('ref=')) {
      const hashQueryIndex = window.location.hash.indexOf('?');
      if (hashQueryIndex !== -1) {
        const hashParams = new URLSearchParams(window.location.hash.slice(hashQueryIndex));
        const fromHash = hashParams.get('ref') || hashParams.get('r') || hashParams.get('referral');
        if (fromHash) {
          const clean = fromHash.trim().toUpperCase();
          if (clean) {
            localStorage.setItem(STORAGE_KEYS.PENDING_REF_CODE, clean);
            localStorage.setItem('usc_pending_ref_code', clean);
            return clean;
          }
        }
      }
    }

    // 3. Fallback regex match on full href
    const match = window.location.href.match(/[?&](?:ref|r|referral)=([A-Za-z0-9_-]+)/i);
    if (match && match[1]) {
      const clean = match[1].trim().toUpperCase();
      if (clean) {
        localStorage.setItem(STORAGE_KEYS.PENDING_REF_CODE, clean);
        localStorage.setItem('usc_pending_ref_code', clean);
        return clean;
      }
    }

    // 4. Check iframe parent URL if accessible
    try {
      if (window.parent && window.parent !== window && window.parent.location.search) {
        const pParams = new URLSearchParams(window.parent.location.search);
        const pRef = pParams.get('ref') || pParams.get('r') || pParams.get('referral');
        if (pRef) {
          const clean = pRef.trim().toUpperCase();
          if (clean) {
            localStorage.setItem(STORAGE_KEYS.PENDING_REF_CODE, clean);
            localStorage.setItem('usc_pending_ref_code', clean);
            return clean;
          }
        }
      }
    } catch {
      // Cross-origin iframe parent access safe to catch
    }
  } catch (err) {
    console.warn('Notice detecting referral code from URL:', err);
  }

  // 5. Return cached pending referral code from localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PENDING_REF_CODE) || localStorage.getItem('usc_pending_ref_code');
    if (saved) return saved.trim().toUpperCase();
  } catch {
    // ignore
  }

  return null;
}

/**
 * Returns currently pending captured referral code.
 */
export function getPendingReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.PENDING_REF_CODE) || localStorage.getItem('usc_pending_ref_code');
}

/**
 * Clears pending referral code after successful registration.
 */
export function clearPendingReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_REF_CODE);
    localStorage.removeItem('usc_pending_ref_code');
  } catch {}
}

/**
 * Retrieves all local referrals for an inviter's referral code from localStorage.
 */
export function getLocalReferrals(inviterRefCode: string): ReferralRecord[] {
  if (typeof window === 'undefined' || !inviterRefCode) return [];
  const cleanCode = inviterRefCode.trim().toUpperCase();

  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.LOCAL_REFERRALS_PREFIX}${cleanCode}`);
    if (raw) {
      const list: ReferralRecord[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }
  } catch (err) {
    console.warn('Error reading local referrals:', err);
  }

  return [];
}

/**
 * Connects a new registered account to a referrer locally in localStorage:
 * - Prevents self-referrals
 * - Prevents duplicate referrals for the same user
 * - Does not allow users to change their original referrer
 */
export function saveLocalReferral(
  inviterRefCode: string,
  invitedUid: string,
  invitedNickname: string
): boolean {
  if (typeof window === 'undefined') return false;

  const cleanInviter = (inviterRefCode || '').trim().toUpperCase();
  if (!cleanInviter || !invitedUid) return false;

  try {
    // 1. Check all referral relationships: cannot refer self or change referrer
    const relsRaw = localStorage.getItem(STORAGE_KEYS.ALL_REFERRAL_RELATIONSHIPS) || '{}';
    const rels: Record<string, { inviterRefCode: string; createdAt: string }> = JSON.parse(relsRaw);

    // Prevent duplicate: if already referred by someone, keep original referrer permanently
    if (rels[invitedUid]) {
      console.log('[Referral] User already has an assigned referrer:', rels[invitedUid].inviterRefCode);
      return false;
    }

    // Save permanent relationship mapping
    rels[invitedUid] = {
      inviterRefCode: cleanInviter,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.ALL_REFERRAL_RELATIONSHIPS, JSON.stringify(rels));

    // 2. Add to inviter's local referral list
    const existingList = getLocalReferrals(cleanInviter);
    const alreadyInList = existingList.some((r) => r.invitedUid === invitedUid);

    if (!alreadyInList) {
      const newRef: ReferralRecord = {
        id: `ref_${invitedUid}`,
        inviterUid: cleanInviter,
        inviterRefCode: cleanInviter,
        invitedUid,
        invitedNickname: invitedNickname || 'Player',
        referralCode: cleanInviter,
        status: 'PENDING',
        completedTasksCount: 0,
        createdAt: new Date().toISOString(),
      };

      existingList.unshift(newRef);
      localStorage.setItem(
        `${STORAGE_KEYS.LOCAL_REFERRALS_PREFIX}${cleanInviter}`,
        JSON.stringify(existingList)
      );
    }

    // Clear the pending referral code
    clearPendingReferralCode();
    return true;
  } catch (err) {
    console.warn('Error saving local referral:', err);
    return false;
  }
}

/**
 * Updates an invited user's ad task progress in the local referral record.
 * When completedCount >= 15, marks referral status as VALID.
 */
export function updateLocalReferralTaskProgress(invitedUid: string, completedCount: number): void {
  if (typeof window === 'undefined' || !invitedUid) return;

  try {
    const relsRaw = localStorage.getItem(STORAGE_KEYS.ALL_REFERRAL_RELATIONSHIPS) || '{}';
    const rels: Record<string, { inviterRefCode: string; createdAt: string }> = JSON.parse(relsRaw);

    const rel = rels[invitedUid];
    if (!rel || !rel.inviterRefCode) return;

    const inviterCode = rel.inviterRefCode;
    const list = getLocalReferrals(inviterCode);
    const index = list.findIndex((r) => r.invitedUid === invitedUid);

    if (index >= 0) {
      const item = list[index];
      const newCount = Math.max(item.completedTasksCount || 0, completedCount);
      const isNowValid = newCount >= 15;

      list[index] = {
        ...item,
        completedTasksCount: newCount,
        status: isNowValid ? 'VALID' : 'PENDING',
        validatedAt: isNowValid ? (item.validatedAt || new Date().toISOString()) : item.validatedAt,
      };

      localStorage.setItem(
        `${STORAGE_KEYS.LOCAL_REFERRALS_PREFIX}${inviterCode}`,
        JSON.stringify(list)
      );

      // If inviter account exists locally, update their validReferralsCount
      const accountsStr = localStorage.getItem(STORAGE_KEYS.LOCAL_ACCOUNTS);
      if (accountsStr) {
        const accounts: any[] = JSON.parse(accountsStr);
        const inviterAcc = accounts.find((a: any) => a.referralCode === inviterCode);
        if (inviterAcc) {
          const validCount = list.filter((r) => r.status === 'VALID' || (r.completedTasksCount || 0) >= 15).length;
          inviterAcc.validReferralsCount = validCount;
          inviterAcc.invitedCount = list.length;
          localStorage.setItem(STORAGE_KEYS.LOCAL_ACCOUNTS, JSON.stringify(accounts));
        }
      }
    }
  } catch (err) {
    console.warn('Error updating local referral task progress:', err);
  }
}

/**
 * Retrieves referral statistics for a given referral code locally.
 */
export function getLocalReferralStats(inviterRefCode: string): {
  totalInvited: number;
  validCount: number;
  pendingCount: number;
  referrals: ReferralRecord[];
} {
  const referrals = getLocalReferrals(inviterRefCode);
  const totalInvited = referrals.length;
  const validCount = referrals.filter((r) => (r.completedTasksCount || 0) >= 15 || r.status === 'VALID').length;
  const pendingCount = totalInvited - validCount;

  return {
    totalInvited,
    validCount,
    pendingCount,
    referrals,
  };
}

/**
 * Verifies if a referral code exists locally or in Firebase.
 */
export async function verifyReferralCodeInFirebase(code: string): Promise<{ inviterUid: string; referralCode: string } | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

  // 1. Check local accounts
  if (typeof window !== 'undefined') {
    try {
      const accountsStr = localStorage.getItem(STORAGE_KEYS.LOCAL_ACCOUNTS) || '[]';
      const accounts: any[] = JSON.parse(accountsStr);
      const match = accounts.find((a: any) => a.referralCode === cleanCode);
      if (match) {
        return {
          inviterUid: match.uid || cleanCode,
          referralCode: cleanCode,
        };
      }
    } catch {}
  }

  // 2. Check Firebase if available
  try {
    const referralsRef = collection(db, 'referrals');
    const q = query(referralsRef, where('referralCode', '==', cleanCode));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data();
      return {
        inviterUid: docData.inviterUid || cleanCode,
        referralCode: cleanCode,
      };
    }
  } catch (err) {
    console.warn('Notice verifying referral code:', err);
  }

  // Fallback: If code is provided, treat it as a valid referral code
  return {
    inviterUid: cleanCode,
    referralCode: cleanCode,
  };
}

/**
 * Creates a referral record connecting invited user to inviter locally and in Firebase.
 */
export async function createReferralRecordInFirebase(
  inviterRefCode: string,
  invitedUid: string,
  invitedNickname: string
) {
  const cleanRefCode = (inviterRefCode || '').trim().toUpperCase();
  if (!cleanRefCode || !invitedUid) return;

  // 1. Always save in localStorage first (guarantees local operation)
  saveLocalReferral(cleanRefCode, invitedUid, invitedNickname);

  // 2. Also save to Firebase if available
  try {
    const docId = `ref_${invitedUid}`;
    const referralRef = doc(db, 'referrals', docId);

    const snap = await getDoc(referralRef);
    if (snap.exists()) {
      return;
    }

    let inviterUid = cleanRefCode;
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referralCode', '==', cleanRefCode));
      const userSnap = await getDocs(q);
      if (!userSnap.empty) {
        inviterUid = userSnap.docs[0].id;
      }
    } catch {}

    const newRecord: ReferralRecord = {
      id: docId,
      inviterUid,
      inviterRefCode: cleanRefCode,
      invitedUid,
      invitedNickname: invitedNickname || 'Player',
      referralCode: cleanRefCode,
      status: 'PENDING',
      completedTasksCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(referralRef, newRecord);
  } catch (err) {
    console.warn('Notice creating referral record in Firebase:', err);
  }
}

/**
 * Process referral reward for inviter when a referral becomes VALID.
 */
export async function processReferralRewardInFirebase(
  referralDocId: string,
  currentInviterUid?: string
): Promise<void> {
  if (!referralDocId) return;

  try {
    const referralDocRef = doc(db, 'referrals', referralDocId);
    const refSnapBefore = await getDoc(referralDocRef);
    if (!refSnapBefore.exists()) return;

    const refData = refSnapBefore.data() as ReferralRecord;
    const completedTasks = typeof refData.completedTasksCount === 'number' ? refData.completedTasksCount : 0;
    const isBothVerified = completedTasks >= 15 || refData.status === 'VALID';
    if (!isBothVerified) return;

    if (refData.rewardClaimedByInviter || (refData as any).referralRewardGranted) return;

    let targetInviterUid = refData.inviterUid || currentInviterUid;
    if (targetInviterUid && !targetInviterUid.startsWith('usr_') && refData.inviterRefCode) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', refData.inviterRefCode));
        const userSnap = await getDocs(q);
        if (!userSnap.empty) {
          targetInviterUid = userSnap.docs[0].id;
        }
      } catch {}
    }

    if (targetInviterUid) {
      await updateDoc(doc(db, 'users', targetInviterUid), {
        validReferralsCount: increment(1),
        spins: increment(1),
        spinCount: increment(1),
      });
      await updateDoc(referralDocRef, {
        rewardClaimedByInviter: true,
        referralRewardGranted: true,
      });
    }
  } catch (err) {
    console.warn('Notice processing referral reward:', err);
  }
}

/**
 * Automatically updates referral task status when tasks are completed.
 */
export async function syncReferralTaskStatusInFirebase(
  invitedUid: string,
  completedTasksOrDetails: number | Record<string, any>,
  taskType?: 'betfugu' | 'colorgame' | 'ad_tasks',
  options?: { attempts?: number; hasProof?: boolean; proofUrl?: string }
): Promise<void> {
  const completedTasksCount = typeof completedTasksOrDetails === 'number'
    ? completedTasksOrDetails
    : (typeof (completedTasksOrDetails as any)?.completedTasksCount === 'number'
      ? (completedTasksOrDetails as any).completedTasksCount
      : 0);

  // Update locally first
  updateLocalReferralTaskProgress(invitedUid, completedTasksCount);

  // Sync to Firebase if available
  try {
    const docId = `ref_${invitedUid}`;
    const referralRef = doc(db, 'referrals', docId);
    const snap = await getDoc(referralRef);
    if (!snap.exists()) return;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof completedTasksOrDetails === 'number') {
      updates.completedTasksCount = completedTasksOrDetails;
      updates.status = completedTasksOrDetails >= 15 ? 'VALID' : 'PENDING';
    } else if (typeof completedTasksOrDetails === 'object' && completedTasksOrDetails !== null) {
      Object.assign(updates, completedTasksOrDetails);
    }

    await updateDoc(referralRef, updates);
  } catch (err) {
    console.warn('Notice syncing referral status in Firebase:', err);
  }
}

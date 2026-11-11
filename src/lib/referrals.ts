import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { ReferralRecord } from '../types';

/**
 * Verifies if a referral code exists in Firestore or locally.
 */
export async function verifyReferralCodeInFirebase(code: string): Promise<{ inviterUid: string; referralCode: string } | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

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
    console.warn('Notice verifying referral code in Firebase:', err);
  }

  // Fallback: If code is provided, treat it as a valid referral code
  return {
    inviterUid: cleanCode,
    referralCode: cleanCode,
  };
}

/**
 * Creates a permanent referral record connecting invited user to inviter in Firebase.
 * Uses document ID `ref_${invitedUid}` to ensure each referred user has strictly ONE inviter.
 */
export async function createReferralRecordInFirebase(
  inviterRefCode: string,
  invitedUid: string,
  invitedNickname: string
) {
  const cleanRefCode = (inviterRefCode || '').trim().toUpperCase();
  if (!cleanRefCode || !invitedUid) return;

  try {
    const docId = `ref_${invitedUid}`;
    const referralRef = doc(db, 'referrals', docId);

    // Check if referral relationship already exists to prevent duplicate / overwrite
    const snap = await getDoc(referralRef);
    if (snap.exists()) {
      return; // A referred user can have only ONE inviter/referral relationship
    }

    // Try to resolve inviter's actual user UID from users collection
    let inviterUid = cleanRefCode;
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referralCode', '==', cleanRefCode));
      const userSnap = await getDocs(q);
      if (!userSnap.empty) {
        inviterUid = userSnap.docs[0].id;
      }
    } catch {
      // Fallback to referral code
    }

    const newRecord: ReferralRecord = {
      id: docId,
      inviterUid,
      inviterRefCode: cleanRefCode,
      invitedUid,
      invitedNickname: invitedNickname || 'User',
      referralCode: cleanRefCode,
      status: 'NOT VALID',
      betfuguCompleted: false,
      betfuguVerified: false,
      colorgameCompleted: false,
      colorgameVerified: false,
      rewardClaimedByInviter: false,
      referralRewardGranted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(referralRef, newRecord);
  } catch (err) {
    console.warn('Notice creating referral record in Firebase:', err);
  }
}

/**
 * Atomic/transaction-safe Firebase update to process +1 spin reward for inviter when a referral becomes VALID.
 * Ensures each valid referral creates a unique reward record and grants exactly +1 spin to the inviter's Firebase balance.
 */
export async function processReferralRewardInFirebase(
  referralDocId: string,
  currentInviterUid?: string
) {
  if (!referralDocId) return;

  const rewardDocRef = doc(db, 'referral_rewards', referralDocId);
  const referralDocRef = doc(db, 'referrals', referralDocId);

  try {
    // 1. Read referral document to get inviter details
    const refSnapBefore = await getDoc(referralDocRef);
    if (!refSnapBefore.exists()) return;

    const refData = refSnapBefore.data() as ReferralRecord;

    const isBetfuguOk = Boolean(refData.betfuguCompleted) && Boolean(refData.betfuguVerified);
    const isColorGameOk = Boolean(refData.colorgameCompleted) && Boolean(refData.colorgameVerified);
    const isValid = (isBetfuguOk && isColorGameOk) || refData.status === 'VALID';

    if (!isValid) return; // Must be VALID
    if (refData.rewardClaimedByInviter || (refData as any).referralRewardGranted) return; // Already claimed

    // Resolve inviter user document reference in `users` collection
    let inviterUidToUse = (currentInviterUid && currentInviterUid.startsWith('usr_'))
      ? currentInviterUid
      : refData.inviterUid;

    // If inviterUid is currently a referral code or missing, lookup the actual user UID in users collection
    if (!inviterUidToUse || !inviterUidToUse.startsWith('usr_')) {
      if (refData.inviterRefCode) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('referralCode', '==', refData.inviterRefCode));
          const userQuerySnap = await getDocs(q);
          if (!userQuerySnap.empty) {
            inviterUidToUse = userQuerySnap.docs[0].id;
          }
        } catch {
          // fallback
        }
      }
    }

    if (!inviterUidToUse) {
      inviterUidToUse = refData.inviterRefCode || 'unknown';
    }

    const inviterUserRef = doc(db, 'users', inviterUidToUse);

    // 2. Execute atomic Firestore transaction
    await runTransaction(db, async (transaction) => {
      // Transaction Read 1: Unique reward record
      const rewardSnap = await transaction.get(rewardDocRef);
      if (rewardSnap.exists()) {
        return; // Already processed!
      }

      // Transaction Read 2: Referral doc
      const refSnap = await transaction.get(referralDocRef);
      if (!refSnap.exists()) return;

      const currentRefData = refSnap.data() as ReferralRecord;
      if (currentRefData.rewardClaimedByInviter || (currentRefData as any).referralRewardGranted) return; // Already processed!

      // Transaction Read 3: Inviter user doc
      const inviterDoc = await transaction.get(inviterUserRef);

      let currentSpins = 0;
      let currentSpinCount = 0;

      if (inviterDoc.exists()) {
        const invData = inviterDoc.data();
        currentSpins = typeof invData.spins === 'number'
          ? invData.spins
          : (typeof invData.spinCount === 'number' ? invData.spinCount : 0);
        currentSpinCount = typeof invData.spinCount === 'number'
          ? invData.spinCount
          : currentSpins;
      }

      const newSpins = currentSpins + 1;
      const newSpinCount = currentSpinCount + 1;

      // Writes in transaction:
      // a) Create unique reward record document
      transaction.set(rewardDocRef, {
        id: referralDocId,
        referralDocId,
        invitedUid: currentRefData.invitedUid,
        inviterRefCode: currentRefData.inviterRefCode,
        inviterUid: inviterUidToUse,
        spinsGranted: 1,
        claimed: true,
        createdAt: new Date().toISOString(),
      });

      // b) Mark rewardClaimedByInviter and referralRewardGranted on referral document
      transaction.update(referralDocRef, {
        rewardClaimedByInviter: true,
        referralRewardGranted: true,
        inviterUid: inviterUidToUse,
        status: 'VALID',
        updatedAt: new Date().toISOString(),
      });

      // c) Increment inviter's spin balance in Firebase users document
      if (inviterDoc.exists()) {
        transaction.update(inviterUserRef, {
          spins: newSpins,
          spinCount: newSpinCount,
          updatedAt: new Date().toISOString(),
        });
      } else {
        transaction.set(inviterUserRef, {
          uid: inviterUidToUse,
          referralCode: currentRefData.inviterRefCode,
          spins: newSpins,
          spinCount: newSpinCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    });
  } catch (err) {
    console.error('[Referral Reward Error] Failed atomic transaction for referralDocId:', referralDocId, err);
    throw err;
  }
}

/**
 * Automatically updates referral task status in Firebase when task status changes.
 * When BOTH BetFugu and ColorGame are completed AND verified, status automatically becomes 'VALID'.
 * Otherwise, status is 'NOT VALID'.
 */
export async function syncReferralTaskStatusInFirebase(
  invitedUid: string,
  taskUpdates: {
    betfuguCompleted?: boolean;
    betfuguVerified?: boolean;
    colorgameCompleted?: boolean;
    colorgameVerified?: boolean;
    nickname?: string;
  }
) {
  if (!invitedUid) return;

  try {
    const docId = `ref_${invitedUid}`;
    const referralRef = doc(db, 'referrals', docId);
    let snap = await getDoc(referralRef);

    if (!snap.exists()) {
      // Check if user has referredBy on their user document
      try {
        const userDocSnap = await getDoc(doc(db, 'users', invitedUid));
        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          const refCode = (uData.referredBy || uData.inviterUid || '').trim().toUpperCase();
          if (refCode) {
            await createReferralRecordInFirebase(refCode, invitedUid, taskUpdates.nickname || uData.nickname || 'User');
            snap = await getDoc(referralRef);
          }
        }
      } catch {
        // ignore
      }

      if (!snap.exists()) {
        return; // No referral relationship exists for this user
      }
    }

    const existingData = snap.data() as ReferralRecord;

    const betfuguCompleted = taskUpdates.betfuguCompleted !== undefined
      ? Boolean(taskUpdates.betfuguCompleted)
      : Boolean(existingData.betfuguCompleted);

    const betfuguVerified = taskUpdates.betfuguVerified !== undefined
      ? Boolean(taskUpdates.betfuguVerified)
      : Boolean(existingData.betfuguVerified);

    const colorgameCompleted = taskUpdates.colorgameCompleted !== undefined
      ? Boolean(taskUpdates.colorgameCompleted)
      : Boolean(existingData.colorgameCompleted);

    const colorgameVerified = taskUpdates.colorgameVerified !== undefined
      ? Boolean(taskUpdates.colorgameVerified)
      : Boolean(existingData.colorgameVerified);

    const isBothVerified = betfuguCompleted && betfuguVerified && colorgameCompleted && colorgameVerified;
    const status: 'VALID' | 'NOT VALID' = isBothVerified ? 'VALID' : 'NOT VALID';

    const updatesToSave: Partial<ReferralRecord> & Record<string, any> = {
      betfuguCompleted,
      betfuguVerified,
      colorgameCompleted,
      colorgameVerified,
      status,
      updatedAt: new Date().toISOString(),
    };

    if (taskUpdates.nickname) {
      updatesToSave.invitedNickname = taskUpdates.nickname;
    }

    if (isBothVerified) {
      updatesToSave.validatedAt = new Date().toISOString();
    }

    await updateDoc(referralRef, updatesToSave);

    // If referral is VALID and reward not yet claimed, trigger atomic reward processing
    if (isBothVerified && !existingData.rewardClaimedByInviter && !(existingData as any).referralRewardGranted) {
      await processReferralRewardInFirebase(docId, existingData.inviterUid);
    }
  } catch (err) {
    console.warn('Notice syncing referral task status in Firebase:', err);
  }
}

/**
 * Official domain for UNO SPIN referral links:
 * https://uno-spin-legit.ai.studio
 */
export const CANONICAL_REFERRAL_DOMAIN = 'https://uno-spin-legit.ai.studio';
export const RUN_APP_CANONICAL_DOMAIN = 'https://uno-spin-legit.ai.studio';

/**
 * Constructs the official personal referral link:
 * https://uno-spin-legit.ai.studio/?ref=UNIQUECODE
 */
export function buildReferralLink(code?: string): string {
  const cleanCode = (code || 'CODE').trim().toUpperCase();
  return `${CANONICAL_REFERRAL_DOMAIN}/?ref=${cleanCode}`;
}

/**
 * Detects referral code from URL query parameters (search or hash), parent iframe, or cached pending code.
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
    const saved = localStorage.getItem('usc_pending_ref_code');
    if (saved) return saved.trim().toUpperCase();
  } catch {
    // ignore
  }

  return null;
}



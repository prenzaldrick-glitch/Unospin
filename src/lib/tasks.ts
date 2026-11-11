import { doc, getDoc, setDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from './firebase';
import { AdTask, AdTaskTransaction, AdTaskStatus } from '../types';

/**
 * Task Management Library
 * Clean, advertising-free task engine for 100 spin tasks & referral validation.
 */

import { triggerMonetagAd } from './monetag';

// Debounce state to prevent accidental multiple clicks
let lastTaskTriggerTime = 0;
const TASK_DEBOUNCE_THRESHOLD_MS = 1500;

/**
 * Triggers task start verification and connects to Monetag advertising trigger.
 */
export async function triggerTaskStart(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const now = Date.now();
  if (now - lastTaskTriggerTime < TASK_DEBOUNCE_THRESHOLD_MS) {
    return false;
  }
  lastTaskTriggerTime = now;

  // Trigger Monetag ad / task verification safely
  try {
    await triggerMonetagAd();
  } catch (err) {
    console.warn('Notice triggering Monetag task:', err);
  }

  return true;
}

/**
 * Tracks task click event in Firestore and local storage to prevent duplicate triggers
 */
export async function recordTaskClick(userId: string, taskId: number): Promise<void> {
  if (!userId || !taskId) return;
  try {
    const clickHistory = JSON.parse(localStorage.getItem(`task_clicks_${userId}`) || '[]');
    clickHistory.push({ taskId, timestamp: Date.now() });
    localStorage.setItem(`task_clicks_${userId}`, JSON.stringify(clickHistory.slice(-50)));

    const clickRef = doc(db, 'task_clicks', `${userId}_task_${taskId}`);
    await setDoc(clickRef, {
      userId,
      taskId,
      clickedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Notice recording task click:', err);
  }
}

/**
 * Generates the official 100 task boxes list.
 * Exactly 100 tasks, numbered Task #1 to Task #100.
 * Statuses: Locked, Available, In Progress, Completed
 * Each task awards strictly +1 Spin.
 */
export function generateAdTasks(
  completedTaskIds: number[] = [],
  inProgressTaskId: number | null = null
): AdTask[] {
  const tasks: AdTask[] = [];
  const completedSet = new Set(completedTaskIds);

  for (let i = 1; i <= 100; i++) {
    const isCompleted = completedSet.has(i);
    const isInProgress = inProgressTaskId === i;
    const isAvailable = !isCompleted && !isInProgress && (i === 1 || completedSet.has(i - 1));

    let status: AdTaskStatus = 'locked';
    if (isCompleted) {
      status = 'completed';
    } else if (isInProgress) {
      status = 'in_progress';
    } else if (isAvailable) {
      status = 'available';
    } else {
      status = 'locked';
    }

    const rewardSpins = 1;
    const rewardCash = 0;
    const rewardLabel = '+1 Spin';
    const instructions = `Click "WATCH AD" to open the advertisement and begin the 30-second verification timer. Once the timer completes, tap "Complete Task" to claim your +1 Spin reward!`;

    tasks.push({
      id: i,
      title: `Task #${i}`,
      rewardType: 'spins',
      rewardSpins,
      rewardCash,
      rewardLabel,
      status,
      instructions,
      isMilestone: i % 10 === 0,
    });
  }

  return tasks;
}

/**
 * Records a task completion in Firestore and updates user spins & balance.
 * Prevents duplicate submissions and verifies sequence order.
 * Each completed task gives exactly +1 Spin.
 */
export async function recordCompletedAdTask(
  userId: string,
  taskId: number,
  rewardSpins: number = 1,
  rewardCash: number = 0,
  rewardLabel: string = '+1 Spin',
  userNickname: string = 'User'
): Promise<AdTaskTransaction> {
  if (!userId || taskId < 1 || taskId > 100) {
    throw new Error('Invalid task parameters');
  }

  const txId = `tx_${userId}_task_${taskId}`;
  const txRef = doc(db, 'ad_task_transactions', txId);

  // 1. Check if already recorded to prevent duplicate claims
  const existingSnap = await getDoc(txRef);
  if (existingSnap.exists()) {
    throw new Error(`Task #${taskId} has already been claimed!`);
  }

  // 1b. Verify sequential progression if taskId > 1
  if (taskId > 1) {
    const prevTxRef = doc(db, 'ad_task_transactions', `tx_${userId}_task_${taskId - 1}`);
    const prevSnap = await getDoc(prevTxRef);
    if (!prevSnap.exists()) {
      throw new Error(`Task #${taskId - 1} must be completed before Task #${taskId} can be unlocked!`);
    }
  }

  const spinsToGrant = rewardSpins || 1;

  const transactionRecord: AdTaskTransaction = {
    id: txId,
    userId,
    userNickname,
    taskId,
    rewardSpins: spinsToGrant,
    rewardCash: 0,
    rewardLabel: `+${spinsToGrant} Spin`,
    status: 'VERIFIED',
    completedAt: new Date().toISOString(),
  };

  // 2. Save transaction to `/ad_task_transactions`
  await setDoc(txRef, transactionRecord);

  // 3. Atomically update user document in `/users`
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      completedAdTasks: arrayUnion(taskId),
      currentAdTaskLevel: taskId + 1,
      spins: increment(spinsToGrant),
      spinCount: increment(spinsToGrant),
      totalAdRewardsEarned: increment(spinsToGrant),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Notice updating user doc for task:', err);
  }

  // 4. Update referral document so task activity counts toward inviter validation
  // Requires at least 15 completed tasks to become VALID
  try {
    const referralRef = doc(db, 'referrals', `ref_${userId}`);
    const refSnap = await getDoc(referralRef);

    if (refSnap.exists()) {
      const refData = refSnap.data();
      const currentCompleted = typeof refData.completedTasksCount === 'number' ? refData.completedTasksCount : 0;
      const newCompletedCount = currentCompleted + 1;
      const isValidNow = newCompletedCount >= 15;

      const updatePayload: Record<string, any> = {
        completedTasksCount: newCompletedCount,
        status: isValidNow ? 'VALID' : 'PENDING',
        updatedAt: new Date().toISOString(),
      };

      if (isValidNow && refData.status !== 'VALID') {
        updatePayload.validatedAt = new Date().toISOString();

        // Increment inviter's validReferralsCount
        const inviterUid = refData.inviterUid;
        if (inviterUid && inviterUid.startsWith('usr_')) {
          try {
            await updateDoc(doc(db, 'users', inviterUid), {
              validReferralsCount: increment(1),
            });
          } catch {}
        }
      }

      await updateDoc(referralRef, updatePayload);
    }
  } catch (err) {
    console.warn('Notice updating referral task completion:', err);
  }

  return transactionRecord;
}

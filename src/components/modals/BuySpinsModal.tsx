import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  Check, 
  Sparkles, 
  Play, 
  Lock, 
  CheckCircle2, 
  Tv,
  Coins,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { UserState, AdTask } from '../../types';
import { soundFx } from '../../utils/sound';
import { 
  generateAdTasks, 
  recordCompletedAdTask, 
  recordTaskClick,
  triggerTaskStart 
} from '../../lib/tasks';
import { injectMonetagTagScript, triggerMonetagAd } from '../../lib/monetag';
import { RewardedAdModal } from './RewardedAdModal';

interface BuySpinsModalProps {
  userState: UserState;
  onClose: () => void;
  onAddSpins: (count: number) => void;
  onAddBalance?: (amount: number) => void;
  onClaimTelegramTask?: () => void;
}

export const BuySpinsModal: React.FC<BuySpinsModalProps> = ({
  userState,
  onClose,
  onAddSpins,
  onAddBalance,
  onClaimTelegramTask,
}) => {
  const [activeModalTask, setActiveModalTask] = useState<AdTask | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<number[]>(
    userState.completedAdTasks || []
  );
  const [inProgressTaskId, setInProgressTaskId] = useState<number | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);

  const currentUid = userState.uid || userState.userId || 'guest';
  const nickname = userState.nickname || userState.fullname || 'Player';

  // Inject Monetag tag script (Zone 12238222) ONLY inside Offers & Tasks section
  useEffect(() => {
    injectMonetagTagScript();
  }, []);

  // Sync completed tasks when userState updates
  useEffect(() => {
    if (userState.completedAdTasks) {
      setCompletedTaskIds(userState.completedAdTasks);
    }
  }, [userState.completedAdTasks]);

  // Load in-progress task from localStorage if preserved
  useEffect(() => {
    try {
      const savedInProgress = localStorage.getItem(`task_in_progress_${currentUid}`);
      if (savedInProgress) {
        const id = parseInt(savedInProgress, 10);
        if (!isNaN(id) && !completedTaskIds.includes(id)) {
          setInProgressTaskId(id);
        }
      }
    } catch {}
  }, [currentUid, completedTaskIds]);

  // Generate all 100 individual tasks (Task 1 to Task 100)
  const tasks: AdTask[] = generateAdTasks(
    completedTaskIds,
    inProgressTaskId
  );

  const completedCount = completedTaskIds.length;
  const progressPercent = Math.min(100, Math.round((completedCount / 100) * 100));

  const handleTelegramClick = () => {
    soundFx.playClick();
    window.open('https://t.me/+OUV5DpUqhh5mY2I1', '_blank', 'noopener,noreferrer');
    if (!userState.telegramTaskCompleted && onClaimTelegramTask) {
      onClaimTelegramTask();
    }
  };

  /**
   * Click handler for "WATCH AD" button on any active task from Task #1 to #100.
   * - Immediately triggers Monetag Zone 12238222 with ONE CLICK
   * - No extra confirmation popups
   * - Debounces rapid double-clicks
   * - Initiates the 30-second verification countdown
   * - Does NOT automatically award +1 Spin until verified
   */
  const handleStartTask = (task: AdTask) => {
    soundFx.playClick();
    if (processingTaskId !== null) return;

    setProcessingTaskId(task.id);

    try {
      // Immediately trigger Monetag Ad
      triggerMonetagAd().catch((e) => console.warn('Ad trigger notice:', e));

      // Async background logging
      recordTaskClick(currentUid, task.id).catch(() => {});
      triggerTaskStart().catch(() => {});

      setInProgressTaskId(task.id);
      try {
        localStorage.setItem(`task_in_progress_${currentUid}`, String(task.id));
      } catch {}

      const updatedTask: AdTask = {
        ...task,
        status: 'in_progress',
      };
      setActiveModalTask(updatedTask);
    } finally {
      setTimeout(() => {
        setProcessingTaskId(null);
      }, 500);
    }
  };

  /**
   * Opens task modal for an in-progress or available task to view instructions / complete
   */
  const handleOpenTaskDetails = (task: AdTask) => {
    soundFx.playClick();
    setActiveModalTask(task);
  };

  /**
   * Claim reward and mark task as completed
   */
  const handleClaimReward = async (task: AdTask) => {
    await recordCompletedAdTask(
      currentUid,
      task.id,
      task.rewardSpins,
      task.rewardCash,
      task.rewardLabel,
      nickname
    );

    const nextCompleted = [...completedTaskIds, task.id];
    setCompletedTaskIds(nextCompleted);

    if (inProgressTaskId === task.id) {
      setInProgressTaskId(null);
      try {
        localStorage.removeItem(`task_in_progress_${currentUid}`);
      } catch {}
    }

    if (task.rewardSpins > 0) {
      onAddSpins(task.rewardSpins);
    }
    if (task.rewardCash > 0 && onAddBalance) {
      onAddBalance(task.rewardCash);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn select-none">
        <div className="relative w-full max-w-[440px] bg-gradient-to-b from-[#180a36] via-[#0d0824] to-[#060318] rounded-3xl p-3.5 sm:p-5 border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.35)] text-white flex flex-col h-[90vh] max-h-[90vh] overflow-hidden">
          
          {/* HEADER */}
          <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/20 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Flame className="w-5 h-5 text-white fill-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-black text-white tracking-wide font-sans leading-none flex items-center gap-1.5">
                  <span>Earn Offers & Tasks</span>
                  <span className="bg-amber-400 text-slate-950 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-amber-300 shadow-sm">
                    100 TASKS
                  </span>
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold text-cyan-300">
                    Daily Spin Rewards
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900/90 text-cyan-200 border border-cyan-500/40">
                    +1 Spin Each
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STICKY PROGRESS OVERVIEW BAR */}
          <div className="my-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#200e47] via-[#120b33] to-[#0b0724] border border-cyan-400/40 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <div className="flex items-center justify-between mb-1.5 text-[11px] font-black">
              <span className="text-cyan-200 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>Task Progress: {completedCount}/100 Completed</span>
              </span>
              <span className="text-amber-300 font-mono text-xs">
                {progressPercent}%
              </span>
            </div>

            {/* Progress Track */}
            <div className="w-full bg-slate-950/90 rounded-full h-2.5 overflow-hidden border border-cyan-500/30">
              <div
                className="bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 mt-1.5">
              <span className="text-cyan-300">
                {completedCount === 100
                  ? 'All 100 Tasks Completed!'
                  : inProgressTaskId
                  ? `Task ${inProgressTaskId} is In Progress`
                  : `Task ${completedCount + 1} is Available`}
              </span>
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                +1 Spin Each
              </span>
            </div>
          </div>

          {/* SCROLLABLE TASKS CONTAINER (TASK 1 TO TASK 100) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-4">
            
            {/* 100 INDIVIDUAL TASKS IN 2-COLUMN GRID */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tasks (Task 1 – Task 100)</span>
                </span>
                <span className="text-[10px] text-amber-300 font-mono font-bold bg-[#1d0e42] px-2 py-0.5 rounded border border-cyan-500/30">
                  Sequential Unlock
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {tasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  const isInProgress = task.status === 'in_progress';
                  const isAvailable = task.status === 'available' || task.status === 'active';
                  const isLocked = task.status === 'locked';
                  const isProcessing = processingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`relative rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-300 ${
                        isCompleted
                          ? 'bg-[#0f172a]/80 border-2 border-emerald-500/50 text-slate-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                          : isInProgress
                          ? 'bg-gradient-to-b from-[#381610] via-[#200e26] to-[#0d0720] border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] scale-[1.02]'
                          : isAvailable
                          ? 'bg-gradient-to-b from-[#240e52] via-[#140b38] to-[#0b0622] border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.45)] scale-[1.02]'
                          : 'bg-[#0b071e]/70 border border-indigo-950/80 text-slate-500'
                      }`}
                    >
                      {/* Top row: Task number & status badge/icon */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[11px] font-black tracking-wide ${
                            isInProgress
                              ? 'text-amber-300'
                              : isAvailable
                              ? 'text-white'
                              : isCompleted
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {task.title}
                        </span>

                        <div>
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950" />
                          ) : isInProgress ? (
                            <span className="text-[8px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                              Active
                            </span>
                          ) : isAvailable ? (
                            <div className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center animate-pulse">
                              <Play className="w-2.5 h-2.5 text-cyan-300 fill-cyan-300 translate-x-0.2" />
                            </div>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </div>
                      </div>

                      {/* Reward Label Badge */}
                      <div className="my-1">
                        <div
                          className={`text-[11px] font-black px-2 py-1 rounded-xl flex items-center justify-center gap-1 text-center ${
                            isInProgress
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-extrabold border border-amber-300'
                              : isAvailable
                              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-md font-extrabold border border-yellow-200/50'
                              : isCompleted
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-900/60 text-slate-400 border border-slate-800'
                          }`}
                        >
                          <Coins className="w-3 h-3 shrink-0" />
                          <span className="truncate">{task.rewardLabel}</span>
                        </div>
                      </div>

                      {/* Action Button: Labeled "Start Task" for available tasks */}
                      <div className="mt-2">
                        {isCompleted ? (
                          <div className="w-full py-1.5 rounded-xl bg-emerald-950/80 text-emerald-400 font-extrabold text-[10px] text-center border border-emerald-500/40 flex items-center justify-center gap-1 shadow-sm">
                            <Check className="w-3 h-3" />
                            <span>COMPLETED</span>
                          </div>
                        ) : isInProgress ? (
                          <button
                            onClick={() => handleOpenTaskDetails(task)}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-[10.5px] text-center shadow-lg shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-200 uppercase tracking-wide"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>COMPLETE TASK</span>
                          </button>
                        ) : isAvailable ? (
                          <button
                            onClick={() => handleStartTask(task)}
                            disabled={isProcessing}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 active:scale-95 text-white font-black text-[11px] text-center shadow-lg shadow-cyan-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-cyan-300/40 uppercase tracking-wide"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                                <span>OPENING AD...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-white" />
                                <span>WATCH AD</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="w-full py-1.5 rounded-xl bg-slate-900/40 text-slate-600 font-bold text-[10px] text-center border border-slate-800/80 flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>LOCKED</span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* FOOTER */}
          <div className="pt-2 border-t border-cyan-500/20 text-center text-[10px] text-slate-400 shrink-0">
            <span>Complete 15 tasks to validate referral and unlock withdrawals</span>
          </div>

        </div>
      </div>

      {/* TASK INTERFACE & COMPLETION MODAL */}
      {activeModalTask && (
        <RewardedAdModal
          task={activeModalTask}
          onClose={() => setActiveModalTask(null)}
          onClaimReward={handleClaimReward}
          onTriggerAd={(_t) => {
            setInProgressTaskId(activeModalTask.id);
            try {
              localStorage.setItem(`task_in_progress_${currentUid}`, String(activeModalTask.id));
            } catch {}
          }}
        />
      )}
    </>
  );
};

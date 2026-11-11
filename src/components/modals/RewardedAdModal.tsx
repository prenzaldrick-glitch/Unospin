import React, { useState, useEffect, useRef } from 'react';
import { X, Play, CheckCircle2, Sparkles, Loader2, Info, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AdTask } from '../../types';
import { soundFx } from '../../utils/sound';
import { triggerTaskStart } from '../../lib/tasks';

interface RewardedAdModalProps {
  task: AdTask;
  onClose: () => void;
  onClaimReward: (task: AdTask) => Promise<void>;
  onTriggerAd: (task: AdTask) => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  task,
  onClose,
  onClaimReward,
  onTriggerAd,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasStartedTask, setHasStartedTask] = useState<boolean>(task.status === 'in_progress');
  const [isClaimed, setIsClaimed] = useState<boolean>(task.status === 'completed');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 30-Second Countdown Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerFinished, setTimerFinished] = useState<boolean>(false);
  const taskStartTimestampRef = useRef<number | null>(null);

  // Countdown Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            setIsTimerRunning(false);
            setTimerFinished(true);
            try {
              soundFx.playWin();
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, secondsRemaining]);

  // If already in_progress when modal opens, start timer automatically
  useEffect(() => {
    if (task.status === 'in_progress' && !timerFinished && !isTimerRunning) {
      setIsTimerRunning(true);
      taskStartTimestampRef.current = Date.now();
    }
  }, [task.status, timerFinished, isTimerRunning]);

  // Trigger WATCH AD & start timer
  const handleStartTask = () => {
    soundFx.playClick();
    setIsProcessing(true);
    setErrorMessage(null);

    triggerTaskStart();
    onTriggerAd(task);
    setHasStartedTask(true);
    setSecondsRemaining(30);
    setIsTimerRunning(true);
    setTimerFinished(false);
    taskStartTimestampRef.current = Date.now();

    setTimeout(() => {
      setIsProcessing(false);
    }, 400);
  };

  // Complete Task & Claim Reward
  const handleCompleteTask = async () => {
    soundFx.playClick();

    // Verify 30-second duration strictly
    if (!timerFinished && secondsRemaining > 0) {
      setErrorMessage(`Please wait ${secondsRemaining} more seconds for task verification.`);
      return;
    }

    // Client timestamp anti-cheat check
    if (taskStartTimestampRef.current) {
      const elapsed = (Date.now() - taskStartTimestampRef.current) / 1000;
      if (elapsed < 28) {
        setErrorMessage('Task duration was not satisfied. Please wait for the full 30 seconds.');
        return;
      }
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await onClaimReward(task);
      setIsClaimed(true);

      try {
        soundFx.playWin();
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      // Auto close after celebration
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.warn('Error completing task:', err);
      setErrorMessage(err?.message || 'Failed to complete task. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const timerProgressPercent = Math.min(100, Math.round(((30 - secondsRemaining) / 30) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-[420px] bg-gradient-to-b from-[#1c0d3d] via-[#0f0927] to-[#070418] rounded-3xl p-5 border-2 border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.45)] text-white flex flex-col overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                <span>{task.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-400/40 uppercase">
                  {task.status === 'completed' || isClaimed ? 'Completed' : hasStartedTask ? 'In Progress' : 'Available'}
                </span>
              </h3>
              <span className="text-[10px] text-cyan-300 font-bold block">
                Reward: <span className="text-yellow-300 font-black">+1 Spin</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            disabled={isProcessing}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TASK BODY */}
        <div className="my-3 flex flex-col gap-3">
          
          {/* VISIBLE 30-SECOND COUNTDOWN DISPLAY */}
          {hasStartedTask && !isClaimed && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#240e4f] to-[#0f092e] border-2 border-cyan-400/80 text-center flex flex-col items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-black uppercase tracking-wider">
                <Clock className={`w-4 h-4 ${isTimerRunning ? 'animate-spin' : ''}`} />
                <span>Task Verification Countdown (30s)</span>
              </div>

              {/* Large Digital Clock */}
              <div className="text-3xl font-black font-mono tracking-widest text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                {formatTime(secondsRemaining)}
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-cyan-500/40 my-1">
                <div
                  className="bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 h-full transition-all duration-1000 shadow-[0_0_8px_rgba(6,182,212,0.7)]"
                  style={{ width: `${timerProgressPercent}%` }}
                />
              </div>

              <div className="text-[11px] font-bold">
                {timerFinished ? (
                  <span className="text-emerald-400 flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    30 seconds complete! Tap "Complete Task" below to claim +1 Spin.
                  </span>
                ) : (
                  <span className="text-slate-300">
                    Task is active. Please wait <span className="text-amber-300 font-extrabold">{secondsRemaining}s</span> to verify.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TASK INSTRUCTIONS CARD */}
          <div className="p-3.5 rounded-2xl bg-[#140b2f]/90 border border-indigo-500/30 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-cyan-300 uppercase tracking-wide">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Task Instructions</span>
            </div>
            <p className="text-[11.5px] text-slate-300 leading-relaxed">
              1. Tap <strong className="text-orange-400">"WATCH AD"</strong> below to open the advertisement and begin the verification timer.<br />
              2. Stay on this screen for the required <strong className="text-amber-300">30-second countdown</strong>.<br />
              3. Once the 30s timer finishes, tap <strong className="text-emerald-400">"Complete Task"</strong> to claim your <span className="text-yellow-300 font-bold">+1 Spin</span>!
            </p>
          </div>

          {/* STATUS & ACTION BUTTONS */}
          {isClaimed ? (
            <div className="py-4 px-3 rounded-2xl bg-emerald-950/80 border-2 border-emerald-400 text-center flex flex-col items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <div>
                <h4 className="text-base font-black text-white">Task Completed!</h4>
                <p className="text-xs text-yellow-300 font-black mt-0.5">+1 Spin credited to your balance</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              
              {/* WATCH AD BUTTON */}
              {!hasStartedTask && (
                <button
                  onClick={handleStartTask}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 border border-cyan-300/40"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Opening Advertisement...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>WATCH AD (30s Timer)</span>
                    </>
                  )}
                </button>
              )}

              {/* COMPLETION BUTTON (LOCKED UNTIL 30-SEC FINISHES) */}
              {hasStartedTask && (
                <button
                  onClick={handleCompleteTask}
                  disabled={isProcessing || !timerFinished}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                    timerFinished && !isProcessing
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 hover:brightness-110 active:scale-98 cursor-pointer shadow-emerald-500/30 border border-emerald-300'
                      : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed opacity-75'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Verifying Completion...</span>
                    </>
                  ) : timerFinished ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Task (+1 Spin)</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Wait {secondsRemaining}s to Unlock (+1 Spin)</span>
                    </>
                  )}
                </button>
              )}

              {!hasStartedTask && (
                <span className="text-[10.5px] text-center text-slate-400">
                  Tap "Start Task" above to begin the 30-second verification countdown.
                </span>
              )}

            </div>
          )}

          {/* ERROR DISPLAY */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/60 text-[11px] text-red-200 text-center flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="pt-2.5 border-t border-cyan-500/20 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Task Verification Protocol</span>
          </span>
          <span className="text-cyan-400 font-mono">30s Duration</span>
        </div>

      </div>
    </div>
  );
};

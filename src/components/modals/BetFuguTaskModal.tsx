import React, { useState, useEffect } from 'react';
import { X, Upload, Check, AlertTriangle, ArrowRight, ShieldCheck, Download, RefreshCw, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserState } from '../../types';
import { soundFx } from '../../utils/sound';

interface BetFuguTaskModalProps {
  userState: UserState;
  onClose: () => void;
  onAddSpins: (count: number) => void;
  onUpdateBetfuguState: (updates: Partial<UserState>) => void;
}

export const BetFuguTaskModal: React.FC<BetFuguTaskModalProps> = ({
  userState,
  onClose,
  onAddSpins,
  onUpdateBetfuguState,
}) => {
  // Determine initial step
  const getInitialStep = () => {
    if (userState.betfuguTaskCompleted) return 6;
    if (userState.betfuguSubmissionAttempts === 1) return 2; // "Back to Task must return specifically to Step 2"
    return 1;
  };

  const [currentStep, setCurrentStep] = useState<number>(getInitialStep);
  const [step3Proof, setStep3Proof] = useState<string | null>(userState.betfuguStep3Proof || null);
  const [step3FileName, setStep3FileName] = useState<string | null>(null);
  const [step5Proof, setStep5Proof] = useState<string | null>(userState.betfuguStep5Proof || null);
  const [step5FileName, setStep5FileName] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<'pending' | 'declined' | 'completed'>(() => {
    if (userState.betfuguTaskCompleted) return 'completed';
    return 'pending';
  });

  // Handle Step 6 review state trigger
  useEffect(() => {
    if (currentStep === 6 && !userState.betfuguTaskCompleted) {
      setIsCheckingAdmin(true);
      const timer = setTimeout(() => {
        setIsCheckingAdmin(false);
        if (userState.betfuguSubmissionAttempts === 1) {
          setReviewResult('declined');
        } else if (userState.betfuguSubmissionAttempts >= 2) {
          setReviewResult('completed');
          // Grant reward ONCE if not already granted
          if (!userState.betfuguRewardGranted) {
            soundFx.playWin();
            onAddSpins(1);
            onUpdateBetfuguState({
              betfuguTaskCompleted: true,
              betfuguRewardGranted: true,
              betfuguSubmissionAttempts: 2,
            });
          }
        }
      }, 1600);

      return () => clearTimeout(timer);
    }
  }, [currentStep, userState.betfuguSubmissionAttempts, userState.betfuguTaskCompleted, userState.betfuguRewardGranted]);

  // Step 3 Upload Handler
  const handleStep3Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please select a smaller screenshot.');
      return;
    }

    soundFx.playClick();
    setStep3FileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setStep3Proof(dataUrl);
      onUpdateBetfuguState({ betfuguStep3Proof: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  // Step 5 Upload Handler
  const handleStep5Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please select a smaller screenshot.');
      return;
    }

    soundFx.playClick();
    setStep5FileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setStep5Proof(dataUrl);
      onUpdateBetfuguState({ betfuguStep5Proof: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  // Step 5 Submission Handler
  const handleSubmitStep5 = () => {
    if (!step5Proof || isSubmitting) return;

    soundFx.playClick();
    setIsSubmitting(true);

    const nextAttempts = userState.betfuguSubmissionAttempts === 0 ? 1 : 2;
    onUpdateBetfuguState({ betfuguSubmissionAttempts: nextAttempts });

    setTimeout(() => {
      setIsSubmitting(false);
      setCurrentStep(6);
    }, 400);
  };

  // "Back to Task" on Declined -> RETURNS DIRECTLY TO STEP 2
  const handleBackToTask = () => {
    soundFx.playClick();
    setReviewResult('pending');
    setCurrentStep(2); // Step 2 OF 6
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-[400px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-5 border-2 border-cyan-400/80 shadow-[0_0_40px_rgba(6,182,212,0.4)] text-white flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 p-0.5 flex items-center justify-center shadow-md">
              <span className="font-black text-slate-950 text-xs">BF</span>
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide leading-none font-sans">
                BetFugu Task
              </h2>
              <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider block mt-0.5">
                Reward: +1 Spin
              </span>
            </div>
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

        {/* STEP PROGRESS BAR */}
        <div className="my-3">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-cyan-300 mb-1">
            <span>Step {currentStep} of 6</span>
            <span className="text-white/80">{Math.round((currentStep / 6) * 100)}% Completed</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1 OF 6 */}
        {currentStep === 1 && (
          <div className="flex flex-col items-center text-center py-2 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-400 p-1 flex items-center justify-center shadow-xl my-2 border border-cyan-200">
              <Sparkles className="w-9 h-9 text-slate-950 fill-cyan-100" />
            </div>

            <h3 className="text-xl font-black text-white tracking-tight mt-1">
              Earn +1 Spin
            </h3>

            <p className="text-xs text-slate-300 my-3 px-2 leading-relaxed">
              Complete the following simple steps to verify your task and earn +1 Spin.
            </p>

            <div className="w-full bg-slate-900/80 rounded-2xl p-3.5 border border-cyan-500/30 text-left my-2 space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span className="text-xs text-slate-200 font-bold">Download BetFugu app</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span className="text-xs text-slate-200 font-bold">Upload download screenshot proof</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span className="text-xs text-slate-200 font-bold">Complete activity & submit final proof</span>
              </div>
            </div>

            <button
              onClick={() => {
                soundFx.playClick();
                setCurrentStep(2);
              }}
              className="w-full mt-4 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-950/80 border border-cyan-100 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <span>Start Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 2 OF 6 */}
        {currentStep === 2 && (
          <div className="flex flex-col items-center text-center py-2 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-1 flex items-center justify-center shadow-lg my-2 border border-cyan-200">
              <Download className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-lg font-black text-white tracking-tight mt-1">
              Download the BetFugu App
            </h3>

            <p className="text-xs text-slate-300 my-3 px-2 leading-relaxed">
              Tap the button below to open the BetFugu link. Install/open the app, then return here.
            </p>

            <a
              href="https://s.betfugu01.com/dmspdbbjs-9cqj"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                soundFx.playClick();
              }}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-950/80 border border-cyan-100 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide my-1"
            >
              <Download className="w-5 h-5" />
              <span>Download Now</span>
            </a>

            <button
              onClick={() => {
                soundFx.playClick();
                setCurrentStep(3);
              }}
              className="w-full my-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-extrabold text-xs border border-cyan-500/40 transition-colors cursor-pointer"
            >
              Already installed? Continue
            </button>
          </div>
        )}

        {/* STEP 3 OF 6 */}
        {currentStep === 3 && (
          <div className="flex flex-col items-center text-center py-2 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-500 p-1 flex items-center justify-center shadow-lg my-2 border border-cyan-200">
              <Upload className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-lg font-black text-white tracking-tight mt-1">
              Upload Screenshot of Download
            </h3>

            <p className="text-xs text-slate-300 my-2 px-2 leading-relaxed">
              Upload a screenshot showing the BetFugu app installed on your device.
            </p>

            {/* Upload Box */}
            <label className="w-full my-3 p-4 rounded-2xl bg-slate-900/90 border-2 border-dashed border-cyan-400/60 hover:border-cyan-300 flex flex-col items-center justify-center cursor-pointer transition-all relative group">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleStep3Upload}
                className="hidden"
              />

              {step3Proof ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={step3Proof}
                    alt="Upload Preview"
                    className="w-20 h-20 object-cover rounded-xl border border-cyan-400 shadow-md"
                  />
                  <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{step3FileName || 'Screenshot Uploaded'}</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 underline">Tap to change image</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <Upload className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black text-white">Tap to upload</span>
                  <span className="text-[11px] font-bold text-slate-400">PNG, JPG up to 10MB</span>
                </div>
              )}
            </label>

            <button
              onClick={() => {
                if (!step3Proof) {
                  alert('Please upload a screenshot of your download before continuing.');
                  return;
                }
                soundFx.playClick();
                setCurrentStep(4);
              }}
              disabled={!step3Proof}
              className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm shadow-lg border transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${
                step3Proof
                  ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 border-cyan-100 hover:brightness-110 active:scale-98 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 4 OF 6 */}
        {currentStep === 4 && (
          <div className="flex flex-col items-center text-center py-2 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 p-1 flex items-center justify-center shadow-lg my-2 border border-cyan-200">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-lg font-black text-white tracking-tight mt-1">
              Complete the BetFugu Task
            </h3>

            <p className="text-xs text-slate-300 my-3 px-2 leading-relaxed">
              Open the BetFugu app and complete the required activity. Follow the instructions shown in the BetFugu app.
            </p>

            <button
              onClick={() => {
                soundFx.playClick();
                setCurrentStep(5);
              }}
              className="w-full mt-3 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-950/80 border border-cyan-100 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <span>I’ve completed the task →</span>
            </button>
          </div>
        )}

        {/* STEP 5 OF 6 */}
        {currentStep === 5 && (
          <div className="flex flex-col items-center text-center py-2 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 p-1 flex items-center justify-center shadow-lg my-2 border border-cyan-200">
              <Upload className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-lg font-black text-white tracking-tight mt-1">
              Upload Screenshot of Your Task
            </h3>

            <p className="text-xs text-slate-300 my-2 px-2 leading-relaxed">
              Submit a clear screenshot showing that you completed the required BetFugu activity.
            </p>

            {/* Upload Box */}
            <label className="w-full my-3 p-4 rounded-2xl bg-slate-900/90 border-2 border-dashed border-cyan-400/60 hover:border-cyan-300 flex flex-col items-center justify-center cursor-pointer transition-all relative group">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleStep5Upload}
                className="hidden"
              />

              {step5Proof ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={step5Proof}
                    alt="Upload Preview"
                    className="w-20 h-20 object-cover rounded-xl border border-cyan-400 shadow-md"
                  />
                  <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{step5FileName || 'Screenshot Uploaded'}</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 underline">Tap to change image</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <Upload className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black text-white">Tap to upload</span>
                  <span className="text-[11px] font-bold text-slate-400">PNG, JPG up to 10MB</span>
                </div>
              )}
            </label>

            <button
              onClick={handleSubmitStep5}
              disabled={!step5Proof || isSubmitting}
              className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm shadow-lg border transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${
                step5Proof && !isSubmitting
                  ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 border-cyan-100 hover:brightness-110 active:scale-98 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : (
                <span>Submit for Review</span>
              )}
            </button>
          </div>
        )}

        {/* STEP 6 OF 6: ADMIN CHECKING / REVIEW SCREEN */}
        {currentStep === 6 && (
          <div className="flex flex-col items-center text-center py-2 animate-fadeIn">
            
            {/* Loading / Checking State */}
            {isCheckingAdmin ? (
              <div className="flex flex-col items-center my-4 py-6">
                <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <ShieldCheck className="w-10 h-10 text-cyan-400" />
                </div>
                <h3 className="text-lg font-black text-white">Checking by Admin</h3>
                <p className="text-xs text-slate-300 mt-2 px-4 leading-relaxed">
                  Our admin team is reviewing your submission. Please wait while your submission is checked.
                </p>
              </div>
            ) : reviewResult === 'declined' ? (
              /* FIRST SUBMISSION — ALWAYS DECLINED VIEW */
              <div className="w-full flex flex-col items-center my-2 p-4 rounded-2xl bg-slate-900/90 border border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 flex items-center justify-center my-2">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-black text-red-400">
                  Submission Declined
                </h3>

                <p className="text-xs text-slate-300 my-3 px-2 leading-relaxed">
                  The submitted proof could not be verified. Please review the task requirements and submit valid proof.
                </p>

                <div className="w-full bg-slate-950/80 rounded-xl p-3 border border-red-500/30 my-2 text-left text-[11px] text-slate-300 font-bold space-y-1">
                  <div className="text-red-400 font-extrabold uppercase">Status: Proof Declined</div>
                  <div>• Ensure screenshot shows active BetFugu installation</div>
                  <div>• Ensure task activity screenshot is clear</div>
                </div>

                {/* Back to Task Button -> RETURNS DIRECTLY TO STEP 2 OF 6 */}
                <button
                  onClick={handleBackToTask}
                  className="w-full mt-3 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white font-black text-sm shadow-lg shadow-red-950/80 border border-yellow-200/60 hover:brightness-110 active:scale-98 transition-all cursor-pointer uppercase tracking-wide"
                >
                  Back to Task
                </button>
              </div>
            ) : (
              /* SECOND SUBMISSION — SUCCESS / COMPLETED VIEW */
              <div className="w-full flex flex-col items-center my-2 p-4 rounded-2xl bg-slate-900/90 border border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/50 flex items-center justify-center my-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <h3 className="text-2xl font-black text-emerald-400">
                  Task Completed
                </h3>

                <div className="my-3 py-2 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black text-xl shadow-lg border border-white/40 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 fill-slate-950" />
                  <span>+1 Spin</span>
                </div>

                <p className="text-xs text-slate-300 mb-2 px-2 leading-relaxed">
                  Congratulations! Your BetFugu task proof was verified and +1 Spin has been credited to your spin balance.
                </p>

                <button
                  onClick={() => {
                    soundFx.playClick();
                    onClose();
                  }}
                  className="w-full mt-3 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-sm shadow-lg border border-cyan-100 hover:brightness-110 active:scale-98 transition-all cursor-pointer uppercase tracking-wide"
                >
                  Done
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

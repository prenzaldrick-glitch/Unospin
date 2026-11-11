import React from 'react';
import { Lock, Unlock, CheckCircle2, AlertCircle, Tv, Users, ArrowRight, Sparkles } from 'lucide-react';
import { computeWithdrawalEligibility, ADS_REQUIRED_FOR_WITHDRAWAL, VALID_REFS_REQUIRED_FOR_WITHDRAWAL, TASKS_REQUIRED_PER_REFERRAL } from '../lib/withdrawalVerification';
import { soundFx } from '../utils/sound';

interface LiveWithdrawalTrackerProps {
  completedAdsCount: number;
  validReferralsCount: number;
  balance?: number;
  onOpenOffers?: () => void;
  onOpenInvites?: () => void;
  onOpenCashout?: () => void;
  variant?: 'compact' | 'full';
  className?: string;
}

export const LiveWithdrawalTracker: React.FC<LiveWithdrawalTrackerProps> = ({
  completedAdsCount,
  validReferralsCount,
  balance = 0,
  onOpenOffers,
  onOpenInvites,
  onOpenCashout,
  variant = 'compact',
  className = '',
}) => {
  const eligibility = computeWithdrawalEligibility(completedAdsCount, validReferralsCount, balance);
  const { isUnlocked, isEligible, pendingAds, pendingReferrals, pendingSummary } = eligibility;

  const adsPercent = Math.min(100, Math.round((completedAdsCount / ADS_REQUIRED_FOR_WITHDRAWAL) * 100));
  const refsPercent = Math.min(100, Math.round((validReferralsCount / VALID_REFS_REQUIRED_FOR_WITHDRAWAL) * 100));

  const isAdsMet = completedAdsCount >= ADS_REQUIRED_FOR_WITHDRAWAL;
  const isRefsMet = validReferralsCount >= VALID_REFS_REQUIRED_FOR_WITHDRAWAL;

  if (variant === 'compact') {
    return (
      <div
        className={`w-full max-w-[390px] mx-auto rounded-2xl p-2.5 bg-gradient-to-r ${
          isUnlocked
            ? 'from-emerald-950/90 via-teal-950/80 to-slate-950 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]'
            : 'from-[#240e4f]/90 via-[#150a33]/90 to-[#0c0524] border border-cyan-400/50 shadow-[0_0_18px_rgba(6,182,212,0.25)]'
        } text-white select-none transition-all ${className}`}
      >
        {/* Top Header: Status & Eligibility */}
        <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20 text-[10.5px]">
          <div className="flex items-center gap-1.5">
            {isUnlocked ? (
              <Unlock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="font-black uppercase tracking-wider text-slate-200">
              Withdrawal Status:
            </span>
            <span
              className={`px-2 py-0.2 rounded-full font-black text-[9px] uppercase tracking-wide border ${
                isUnlocked
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/50'
              }`}
            >
              {isUnlocked ? 'ELIGIBLE' : 'LOCKED'}
            </span>
          </div>

          <span className="text-[10px] font-mono font-bold text-yellow-300">
            ₱500 Target
          </span>
        </div>

        {/* 2-Column Progress Trackers */}
        <div className="grid grid-cols-2 gap-2 my-2">
          {/* TRACKER 1: ADS COMPLETED (0/30) */}
          <div
            onClick={() => {
              if (onOpenOffers) {
                soundFx.playClick();
                onOpenOffers();
              }
            }}
            className={`p-2 rounded-xl bg-slate-950/80 border transition-all ${
              isAdsMet
                ? 'border-emerald-500/60 shadow-sm'
                : 'border-cyan-500/40 hover:border-cyan-300 cursor-pointer active:scale-98'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] mb-1 font-extrabold">
              <span className="text-cyan-300 flex items-center gap-1">
                <Tv className="w-3 h-3 text-cyan-400" />
                <span>Ads Done</span>
              </span>
              <span className={`font-mono font-black ${isAdsMet ? 'text-emerald-400' : 'text-amber-300'}`}>
                {completedAdsCount}/{ADS_REQUIRED_FOR_WITHDRAWAL}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isAdsMet ? 'bg-emerald-400' : 'bg-gradient-to-r from-orange-500 to-amber-400'
                }`}
                style={{ width: `${adsPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[8.5px] mt-1 text-slate-400 font-bold">
              <span>{isAdsMet ? '✓ 30 Completed' : `Need ${pendingAds} more`}</span>
              <span className="text-cyan-400 hover:underline">Tap to Earn</span>
            </div>
          </div>

          {/* TRACKER 2: VALID REFERRALS (0/8, 15 ADS EACH) */}
          <div
            onClick={() => {
              if (onOpenInvites) {
                soundFx.playClick();
                onOpenInvites();
              }
            }}
            className={`p-2 rounded-xl bg-slate-950/80 border transition-all ${
              isRefsMet
                ? 'border-emerald-500/60 shadow-sm'
                : 'border-cyan-500/40 hover:border-cyan-300 cursor-pointer active:scale-98'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] mb-1 font-extrabold">
              <span className="text-cyan-300 flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                <span>Valid Refs</span>
              </span>
              <span className={`font-mono font-black ${isRefsMet ? 'text-emerald-400' : 'text-amber-300'}`}>
                {validReferralsCount}/{VALID_REFS_REQUIRED_FOR_WITHDRAWAL}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isRefsMet ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                }`}
                style={{ width: `${refsPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[8.5px] mt-1 text-slate-400 font-bold">
              <span>{isRefsMet ? '✓ 8 Validated' : `Need ${pendingReferrals} more`}</span>
              <span className="text-amber-300 font-mono">15 ads/ref</span>
            </div>
          </div>
        </div>

        {/* Pending message / summary */}
        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9.5px]">
          <span className="text-slate-300 font-semibold truncate max-w-[280px]">
            {isUnlocked ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>30 Ads & 8 Valid Referrals Verified!</span>
              </span>
            ) : (
              <span className="text-amber-200">
                🔒 {pendingSummary}
              </span>
            )}
          </span>

          {onOpenCashout && (
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenCashout();
              }}
              className="text-cyan-300 hover:text-white font-extrabold uppercase tracking-wide flex items-center gap-0.5 shrink-0"
            >
              <span>Cashout</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full / Modal Variant
  return (
    <div className={`p-3.5 rounded-2xl bg-gradient-to-b from-[#180a3a] via-[#100729] to-[#0a051d] border-2 ${
      isUnlocked ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.3)]' : 'border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
    } text-white space-y-3 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Unlock className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black">
              <Lock className="w-4 h-4" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wide">
              Withdrawal Eligibility Tracker
            </h4>
            <span className="text-[10px] text-cyan-300 font-bold block">
              Requirements: 30 Ads Completed & 8 Valid Referrals
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
          isUnlocked
            ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md'
            : 'bg-red-950 text-red-300 border-red-500/50'
        }`}>
          {isUnlocked ? 'ELIGIBLE' : 'LOCKED'}
        </span>
      </div>

      {/* 2 Detailed Progress Bars */}
      <div className="space-y-2.5">
        {/* Requirement 1: Ads Completed (0/30) */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-extrabold">
            <span className="text-cyan-300 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Complete 30 Ads in Offers</span>
            </span>
            <span className={`font-mono font-black ${isAdsMet ? 'text-emerald-400' : 'text-amber-300'}`}>
              {completedAdsCount}/{ADS_REQUIRED_FOR_WITHDRAWAL} {isAdsMet ? '✓' : ''}
            </span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAdsMet ? 'bg-emerald-400' : 'bg-gradient-to-r from-orange-500 to-amber-400'
              }`}
              style={{ width: `${adsPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>{isAdsMet ? 'Requirement Satisfied' : `Needs ${pendingAds} more task ad completions`}</span>
            {onOpenOffers && !isAdsMet && (
              <button
                type="button"
                onClick={onOpenOffers}
                className="text-cyan-400 hover:text-cyan-200 font-bold hover:underline cursor-pointer"
              >
                Go to Offers &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Requirement 2: Valid Referrals (0/8, 15 ads each) */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-extrabold">
            <span className="text-cyan-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Invite 8 Valid Users (15 ads each)</span>
            </span>
            <span className={`font-mono font-black ${isRefsMet ? 'text-emerald-400' : 'text-amber-300'}`}>
              {validReferralsCount}/{VALID_REFS_REQUIRED_FOR_WITHDRAWAL} {isRefsMet ? '✓' : ''}
            </span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isRefsMet ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500'
              }`}
              style={{ width: `${refsPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>Each invited user must complete 15/15 ads to become valid</span>
            {onOpenInvites && !isRefsMet && (
              <button
                type="button"
                onClick={onOpenInvites}
                className="text-cyan-400 hover:text-cyan-200 font-bold hover:underline cursor-pointer"
              >
                Invite Friends &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pending status / resolution notice */}
      <div className={`p-2.5 rounded-xl border text-[11px] font-bold ${
        isUnlocked
          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200 flex items-center gap-2'
          : 'bg-amber-950/80 border-amber-500/60 text-amber-200 flex items-center gap-2'
      }`}>
        {isUnlocked ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <span>{pendingSummary}</span>
      </div>
    </div>
  );
};

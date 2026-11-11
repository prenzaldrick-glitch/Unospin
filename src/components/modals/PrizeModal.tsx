import React from 'react';
import { X, Gift, Smartphone, Crown, ShieldCheck } from 'lucide-react';
import { soundFx } from '../../utils/sound';

interface PrizeModalProps {
  iphoneFragments: number;
  onClose: () => void;
}

export const PrizeModal: React.FC<PrizeModalProps> = ({ iphoneFragments, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[390px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-5 border-2 border-fuchsia-400/70 shadow-[0_0_35px_rgba(217,70,239,0.4)] text-white flex flex-col max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-fuchsia-500/30">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-fuchsia-300 fill-fuchsia-400" />
            <h2 className="text-lg font-black text-white tracking-wide font-sans">
              Prize Vault
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

        {/* Featured Grand Prize Card: iPhone 17 */}
        <div className="my-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-pink-950 to-slate-900 border border-fuchsia-400/60 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-14 h-20 bg-slate-900 rounded-xl border border-fuchsia-300 p-1 flex flex-col items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-10 h-10 text-pink-300" />
            </div>

            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-pink-300 tracking-wider block">
                GRAND PRIZE
              </span>
              <h3 className="text-base font-black text-white">Apple iPhone 17 (256GB)</h3>
              <p className="text-[11px] text-white/70 mt-0.5">
                Collect 5 puzzle fragments to claim physical delivery!
              </p>
            </div>
          </div>

          {/* Fragment Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-pink-200">Fragment Progress:</span>
              <span className="text-yellow-300 font-extrabold">{iphoneFragments} / 5</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full p-0.5 border border-pink-500/40 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-400 rounded-full transition-all duration-500"
                style={{ width: `${(iphoneFragments / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Secondary Prizes */}
        <div className="space-y-2 my-2">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Crown className="w-6 h-6 text-yellow-400" />
              <div>
                <h4 className="text-xs font-black text-white">VIP Gold Pass</h4>
                <span className="text-[10px] text-white/60 block">Unlocks +10 Daily Free Spins</span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              ACTIVE
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="text-xs font-black text-white">Instant Cash Guarantee</h4>
                <span className="text-[10px] text-white/60 block">100% verified GCash payout license</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/30">
              VERIFIED
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

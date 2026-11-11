import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { PesoCoinIcon } from './PesoCoinIcon';
import { soundFx } from '../utils/sound';

interface BalanceSectionProps {
  balance: number;
  onOpenCashout: () => void;
}

export const BalanceSection: React.FC<BalanceSectionProps> = ({ balance, onOpenCashout }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const targetAmount = 500;
  const remaining = Math.max(targetAmount - balance, 0);
  const progressPercent = Math.min((balance / targetAmount) * 100, 100);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playClick();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="w-full px-5 pt-1 pb-2 flex flex-col items-center justify-center text-center z-20 select-none">
      {/* Balance Row */}
      <div 
        onClick={() => {
          soundFx.playClick();
          onOpenCashout();
        }}
        className="flex items-center justify-center gap-2 cursor-pointer group active:scale-98 transition-transform"
      >
        <PesoCoinIcon size={34} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:rotate-12 transition-transform" />
        
        <span className="text-3xl sm:text-4xl font-black text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tracking-tight font-sans text-stroke-black">
          ₱{balance.toFixed(2)}
        </span>

        <button 
          onClick={handleRefresh}
          className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer ml-1"
          title="Refresh Balance"
        >
          <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-yellow-300' : ''}`} />
        </button>
      </div>

      {/* Progress Bar Container */}
      <div 
        onClick={() => {
          soundFx.playClick();
          onOpenCashout();
        }}
        className="w-full max-w-[320px] mt-2 mb-1.5 cursor-pointer"
      >
        <div className="w-full h-4 bg-slate-950/80 rounded-full p-0.5 border border-cyan-400/40 shadow-inner overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-700 relative shadow-[0_0_10px_rgba(234,179,8,0.7)]"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Glossy top highlight */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-full" />
          </div>
        </div>
      </div>

      {/* Cash Out Target Text */}
      <p className="text-xs sm:text-sm font-black italic text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] tracking-wide">
        {remaining > 0 ? (
          <>
            Only <span className="text-yellow-300 font-extrabold">₱{remaining.toFixed(2)}</span> to cash out <span className="text-emerald-300 font-extrabold">₱500</span>!
          </>
        ) : (
          <span className="text-emerald-300 font-extrabold animate-pulse">
            🎉 Ready to cash out ₱500 now!
          </span>
        )}
      </p>
    </div>
  );
};

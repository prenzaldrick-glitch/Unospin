import React, { useState } from 'react';
import { X, Play, Check, Ticket, Gift } from 'lucide-react';
import { soundFx } from '../../utils/sound';

interface AddSpinModalProps {
  onClose: () => void;
  onAddSpins: (count: number) => void;
}

export const AddSpinModal: React.FC<AddSpinModalProps> = ({ onClose, onAddSpins }) => {
  const [isWatching, setIsWatching] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleWatchAd = () => {
    soundFx.playClick();
    setIsWatching(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          soundFx.playCoin();
          onAddSpins(1);
          setIsWatching(false);
          alert('🎉 Rewarded Task Completed! +1 FREE SPIN added!');
          onClose();
          return 100;
        }
        return prev + 25;
      });
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[360px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-5 border-2 border-red-500/80 shadow-[0_0_35px_rgba(239,68,68,0.5)] text-white flex flex-col text-center items-center">
        
        {/* Close */}
        <button
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 my-2 rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 p-1 flex items-center justify-center shadow-lg border-2 border-white/60">
          <Ticket className="w-9 h-9 text-yellow-100 fill-amber-300 stroke-1" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-white my-1">
          Get +1 FREE SPIN!
        </h2>
        <p className="text-xs text-white/80 mb-4 px-2">
          Watch a quick 3-second sponsored video to claim your free spin ticket!
        </p>

        {isWatching ? (
          <div className="w-full my-3">
            <span className="text-xs font-bold text-yellow-300 block mb-1">
              Loading Sponsored Video... ({progress}%)
            </span>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-amber-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={handleWatchAd}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white font-black text-sm shadow-lg shadow-red-950/80 border border-yellow-200/80 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Play className="w-5 h-5 fill-white text-red-600" />
            <span>WATCH AD (+1 SPIN)</span>
          </button>
        )}

      </div>
    </div>
  );
};

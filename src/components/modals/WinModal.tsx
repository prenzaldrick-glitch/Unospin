import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Sparkles, Trophy } from 'lucide-react';
import { WheelSegment } from '../../types';
import { soundFx } from '../../utils/sound';
import { PesoCoinIcon } from '../PesoCoinIcon';

interface WinModalProps {
  segment: WheelSegment;
  rewardValue: number;
  isDouble: boolean;
  onClose: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  segment,
  rewardValue,
  isDouble,
  onClose,
}) => {
  useEffect(() => {
    // Trigger celebratory confetti on win modal open!
    if (segment.type === 'cash_500' || segment.type === 'iphone' || segment.type === 'mega') {
      soundFx.playJackpot();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      soundFx.playCoin();
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });
    }
  }, [segment]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[360px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-6 border-2 border-yellow-400/80 shadow-[0_0_40px_rgba(234,179,8,0.5)] text-center text-white flex flex-col items-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-1.5 text-amber-300 font-black text-xl mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-200" />
          <span>CONGRATULATIONS!</span>
          <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-200" />
        </div>

        {/* Reward Subtitle */}
        <p className="text-xs text-white/80 mb-4 font-semibold">
          You landed on <span className="text-yellow-300 font-extrabold">{segment.label}</span>!
        </p>

        {/* Visual Icon / Display */}
        <div className="w-24 h-24 my-2 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 p-1 flex items-center justify-center shadow-[0_0_25px_rgba(234,179,8,0.8)] border-2 border-white/60 animate-bounce">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-4xl">
            {segment.type === 'cash_500' && '💰'}
            {segment.type === 'mini' && '🪙'}
            {segment.type === 'mega' && '💎'}
            {segment.type === 'double' && '⚡'}
            {segment.type === 'random' && '🎁'}
            {segment.type === 'iphone' && '📱'}
            {segment.type === 'medium' && '💵'}
          </div>
        </div>

        {/* Result Amount */}
        {rewardValue > 0 ? (
          <div className="my-3">
            <span className="text-xs font-bold text-slate-300 uppercase block tracking-wider">
              {isDouble ? '2X DOUBLE REWARD ADDED!' : 'CASH REWARD'}
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <PesoCoinIcon size={32} />
              <span className="text-3xl font-black text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                +₱{rewardValue.toFixed(2)}
              </span>
            </div>
          </div>
        ) : segment.type === 'double' ? (
          <div className="my-3 bg-purple-950/80 border border-purple-400/50 rounded-xl p-3 text-purple-200">
            <span className="text-lg font-black text-fuchsia-300 block">⚡ DOUBLE ACTIVE!</span>
            <span className="text-xs">Your NEXT spin reward will be DOUBLED!</span>
          </div>
        ) : segment.type === 'iphone' ? (
          <div className="my-3 bg-pink-950/80 border border-pink-400/50 rounded-xl p-3 text-pink-200">
            <span className="text-lg font-black text-pink-300 block">📱 iPhone 17 FRAGMENT!</span>
            <span className="text-xs">Collected 1 fragment! (Check Prize drawer)</span>
          </div>
        ) : (
          <div className="my-3 text-yellow-300 font-bold text-sm">
            {segment.valueText}
          </div>
        )}

        {/* Claim Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="w-full mt-3 py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-base shadow-lg shadow-amber-950/80 border border-white hover:brightness-110 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
        >
          CLAIM REWARD
        </button>

      </div>
    </div>
  );
};

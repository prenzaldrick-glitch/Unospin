import React from 'react';
import { Ticket, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { ModalType } from '../types';
import { soundFx } from '../utils/sound';

interface LowerControlsProps {
  noAnimation: boolean;
  onToggleNoAnimation: () => void;
  onOpenModal: (modal: ModalType) => void;
  onTriggerShare: (platform: string) => void;
}

export const LowerControls: React.FC<LowerControlsProps> = ({
  noAnimation,
  onToggleNoAnimation,
  onOpenModal,
  onTriggerShare,
}) => {
  return (
    <div className="w-full px-3 pt-0.5 pb-2 flex flex-col items-center gap-2 z-20 select-none shrink-0">
      
      {/* LOWER WHEEL INFORMATION ROW (NO ANIMATION TOGGLE ONLY) */}
      <div className="w-full flex items-center justify-end text-[11px] font-bold text-white/90 px-1">
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-200 transition-colors">
          <input
            type="checkbox"
            checked={noAnimation}
            onChange={() => {
              soundFx.playClick();
              onToggleNoAnimation();
            }}
            className="w-3.5 h-3.5 rounded accent-cyan-400 cursor-pointer border-cyan-300"
          />
          <span className="text-[11px] font-extrabold text-white">No Animation</span>
        </label>
      </div>

      {/* INVITE FRIENDS BUTTON */}
      <button
        onClick={() => {
          soundFx.playClick();
          onOpenModal('invites');
        }}
        className="w-full max-w-[320px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-500 text-white font-black shadow-md shadow-cyan-950/60 border border-cyan-100/60 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 group"
      >
        <Ticket className="w-4 h-4 fill-yellow-300 text-cyan-900 group-hover:rotate-12 transition-transform" />
        <span className="text-base font-black italic text-white tracking-wide drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]">
          Invite friends
        </span>
      </button>

      {/* SHARE SECTION */}
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          Share:
        </span>

        <div className="flex items-center gap-2">
          {/* 1. Light Gray Chain / Link Icon */}
          <button
            onClick={() => onTriggerShare('link')}
            className="w-7 h-7 rounded-full bg-slate-300/90 text-slate-800 hover:bg-white flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
            title="Copy Link"
          >
            <LinkIcon className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* 2. Green WhatsApp Icon */}
          <button
            onClick={() => onTriggerShare('whatsapp')}
            className="w-7 h-7 rounded-full bg-emerald-500 text-white hover:bg-emerald-400 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
            title="Share via WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white text-emerald-500 stroke-1" />
          </button>

          {/* 3. Black X Icon */}
          <button
            onClick={() => onTriggerShare('x')}
            className="w-7 h-7 rounded-full bg-black text-white hover:bg-slate-900 border border-slate-700 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
            title="Share on X"
          >
            <span className="font-black text-xs">X</span>
          </button>

          {/* 4. Blue Facebook Icon */}
          <button
            onClick={() => onTriggerShare('facebook')}
            className="w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-500 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
            title="Share on Facebook"
          >
            <span className="font-black text-xs font-serif">f</span>
          </button>
        </div>
      </div>

    </div>
  );
};

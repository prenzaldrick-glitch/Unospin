import React from 'react';
import { X, ChevronDown, MoreVertical } from 'lucide-react';
import { soundFx } from '../utils/sound';

interface MobileHeaderProps {
  onClose?: () => void;
  onOpenMenu?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onClose, onOpenMenu }) => {
  return (
    <header className="h-[46px] bg-black text-white px-3 flex items-center justify-between border-b border-slate-800/80 shrink-0 z-30 select-none shadow-md">
      {/* Left: Close icon */}
      <button 
        onClick={() => {
          soundFx.playClick();
          if (onClose) onClose();
        }}
        className="p-1 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-white flex items-center justify-center cursor-pointer"
        aria-label="Close"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Center: Clean spacer (NO game name text) */}
      <div className="flex-1" />

      {/* Right: Chevron and Menu */}
      <div className="flex items-center gap-1">
        <button 
          onClick={() => {
            soundFx.playClick();
            if (onOpenMenu) onOpenMenu();
          }}
          className="p-1 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-white flex items-center justify-center cursor-pointer"
          aria-label="Options"
        >
          <ChevronDown className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button 
          onClick={() => {
            soundFx.playClick();
            if (onOpenMenu) onOpenMenu();
          }}
          className="p-1 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-white flex items-center justify-center cursor-pointer"
          aria-label="More Menu"
        >
          <MoreVertical className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </header>
  );
};

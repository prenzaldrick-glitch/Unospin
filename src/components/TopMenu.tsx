import React from 'react';
import { Trophy, Flame, Users } from 'lucide-react';
import { PesoCoinIcon } from './PesoCoinIcon';
import { ModalType } from '../types';
import { soundFx } from '../utils/sound';

interface TopMenuProps {
  onOpenModal: (modal: ModalType) => void;
}

export const TopMenu: React.FC<TopMenuProps> = ({ onOpenModal }) => {
  return (
    <div className="w-full px-2 pt-2 pb-0.5 grid grid-cols-4 gap-1.5 z-20 select-none shrink-0">
      {/* 1. RANKING */}
      <button
        onClick={() => {
          soundFx.playClick();
          onOpenModal('ranking');
        }}
        className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl bg-gradient-to-b from-cyan-400 via-blue-600 to-blue-800 text-white font-black shadow-md shadow-blue-950/60 border border-cyan-200/50 hover:brightness-110 active:scale-95 transition-all cursor-pointer group relative"
      >
        <div className="w-6 h-6 mb-0.5 flex items-center justify-center drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
          <Trophy className="w-5 h-5 text-amber-200 fill-amber-300 stroke-blue-950 stroke-1" />
        </div>
        <span className="text-[10px] sm:text-[11px] font-black tracking-wide text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)] leading-none text-center whitespace-nowrap">
          Ranking
        </span>
      </button>

      {/* 2. OFFERS (HOT) */}
      <button
        onClick={() => {
          soundFx.playClick();
          onOpenModal('offers');
        }}
        className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl bg-gradient-to-b from-amber-400 via-orange-500 to-red-700 text-white font-black shadow-[0_0_12px_rgba(239,68,68,0.7)] shadow-red-950/80 border-2 border-amber-300/90 hover:brightness-110 active:scale-95 transition-all cursor-pointer group relative"
      >
        {/* Small HOT Badge */}
        <span className="absolute -top-1.5 -right-1 bg-gradient-to-r from-red-600 to-amber-400 text-white font-black text-[7.5px] px-1 py-0.5 rounded-full border border-yellow-200 shadow-md uppercase tracking-tighter animate-pulse z-10 leading-none">
          HOT
        </span>

        <div className="w-6 h-6 mb-0.5 flex items-center justify-center drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform">
          <Flame className="w-5 h-5 text-amber-200 fill-orange-400 stroke-red-950 stroke-1" />
        </div>
        <span className="text-[10px] sm:text-[11px] font-black tracking-wide text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)] leading-none text-center whitespace-nowrap">
          Offers (HOT)
        </span>
      </button>

      {/* 3. INVITES */}
      <button
        onClick={() => {
          soundFx.playClick();
          onOpenModal('invites');
        }}
        className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl bg-gradient-to-b from-cyan-400 via-blue-600 to-blue-800 text-white font-black shadow-md shadow-blue-950/60 border border-cyan-200/50 hover:brightness-110 active:scale-95 transition-all cursor-pointer group relative"
      >
        <div className="w-6 h-6 mb-0.5 flex items-center justify-center drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
          <Users className="w-5 h-5 text-cyan-100 fill-cyan-300 stroke-blue-950 stroke-1" />
        </div>
        <span className="text-[10px] sm:text-[11px] font-black tracking-wide text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)] leading-none text-center whitespace-nowrap">
          Invites
        </span>
      </button>

      {/* 4. CASHOUT */}
      <button
        onClick={() => {
          soundFx.playClick();
          onOpenModal('cashout');
        }}
        className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 text-white font-black shadow-md shadow-amber-950/60 border border-yellow-100/60 hover:brightness-110 active:scale-95 transition-all cursor-pointer group relative"
      >
        <div className="w-6 h-6 mb-0.5 flex items-center justify-center group-hover:scale-110 transition-transform">
          <PesoCoinIcon size={22} />
        </div>
        <span className="text-[10px] sm:text-[11px] font-black tracking-wide text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)] leading-none text-center whitespace-nowrap">
          Cashout
        </span>
      </button>
    </div>
  );
};

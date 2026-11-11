import React from 'react';
import { X, Volume2, VolumeX, Calendar, HelpCircle, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { soundFx } from '../../utils/sound';

interface MoreModalProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClose: () => void;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
}

export const MoreModal: React.FC<MoreModalProps> = ({
  soundEnabled,
  onToggleSound,
  onClose,
  onLogout,
  onOpenAdmin,
}) => {
  const handleLogout = async () => {
    soundFx.playClick();
    try {
      await signOut(auth);
      if (onLogout) onLogout();
      onClose();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-[390px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-5 border-2 border-red-500/70 shadow-[0_0_35px_rgba(239,68,68,0.4)] text-white flex flex-col max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-red-500/30">
          <h2 className="text-lg font-black text-white tracking-wide font-sans">
            Options & Settings
          </h2>
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

        {/* Sound Toggle */}
        <div className="my-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-300" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            <div>
              <h4 className="text-xs font-black text-white">Sound Effects</h4>
              <span className="text-[10px] text-white/60 block">Wheel ticking, win chimes & audio</span>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onToggleSound();
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              soundEnabled ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Daily Streak Check-In */}
        <div className="my-2 p-3.5 rounded-2xl bg-gradient-to-r from-red-950 via-orange-950 to-amber-950 border border-orange-500/40">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-yellow-300" />
            <h3 className="text-xs font-black text-white">7-Day Daily Spin Bonus</h3>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'].map((day, idx) => (
              <div
                key={day}
                className={`p-1.5 rounded-lg border text-[9px] font-extrabold ${
                  idx === 0
                    ? 'bg-yellow-400 text-slate-950 border-white'
                    : 'bg-slate-900/80 border-slate-700 text-slate-400'
                }`}
              >
                <span>{day}</span>
                <span className="block text-[10px] text-amber-900 font-black">+{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Game Rules & Probability Table */}
        <div className="my-2 p-3 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-cyan-300" />
            <h3 className="text-xs font-black text-white">Fair Play & Prize Odds</h3>
          </div>
          <ul className="text-[11px] text-white/80 space-y-1 list-disc list-inside font-medium">
            <li>Every spin consumes exactly 1 spin ticket.</li>
            <li>Double multiplier applies to your subsequent spin win.</li>
            <li>Cash rewards are instantly credited to your ₱ Peso balance.</li>
            <li>Verified GCash & Maya withdrawals require 8 valid referrals (15 ad tasks each).</li>
          </ul>
        </div>

        {/* ADMIN DASHBOARD BUTTON */}
        {onOpenAdmin && (
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenAdmin();
            }}
            className="w-full mt-2 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 hover:brightness-110 border border-indigo-500/60 text-indigo-200 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>ADMINISTRATOR DASHBOARD</span>
          </button>
        )}

        {/* LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          className="w-full mt-2.5 py-3 px-4 rounded-2xl bg-red-950/80 hover:bg-red-900 border border-red-500/80 text-red-200 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>LOGOUT ACCOUNT</span>
        </button>

      </div>
    </div>
  );
};

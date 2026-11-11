import React from 'react';
import { X, Trophy, Medal, Crown } from 'lucide-react';
import { LeaderboardUser, UserState } from '../../types';
import { soundFx } from '../../utils/sound';

interface RankingModalProps {
  userState?: UserState;
  onClose: () => void;
}

const LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'Maria S. (0917***)', amount: 15480.00, avatar: '👩‍💼', badge: '👑 Grand Winner' },
  { rank: 2, name: 'Juan D. (0928***)', amount: 12850.50, avatar: '👨‍💻', badge: '🥈 Master Spinner' },
  { rank: 3, name: 'Angelica P. (0995***)', amount: 9620.00, avatar: '👩‍🎓', badge: '🥉 Pro Player' },
  { rank: 4, name: 'Mark T. (0908***)', amount: 7450.00, avatar: '👨‍🚀' },
  { rank: 5, name: 'Rhea B. (0939***)', amount: 6210.00, avatar: '👩‍🎨' },
  { rank: 6, name: 'Dave K. (0977***)', amount: 5190.00, avatar: '👨‍🔧' },
  { rank: 7, name: 'Jasmine L. (0915***)', amount: 4800.00, avatar: '👩‍⚕️' },
  { rank: 8, name: 'Carlo G. (0927***)', amount: 4120.00, avatar: '👨‍🏫' },
];

export const RankingModal: React.FC<RankingModalProps> = ({ userState, onClose }) => {
  const displayName = userState?.nickname || userState?.fullname || (userState?.userId ? `ID: ${userState.userId}` : 'You (Player)');
  const currentWinnings = userState ? userState.balance : 485.37;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[390px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-5 border-2 border-cyan-400/70 shadow-[0_0_35px_rgba(6,182,212,0.4)] text-white flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400 fill-amber-300" />
            <h2 className="text-lg font-black text-white tracking-wide font-sans">
              Weekly Leaderboard
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

        {/* Prize Pool Banner */}
        <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 border border-cyan-400/40 text-center shadow-inner">
          <span className="text-[11px] uppercase tracking-wider text-cyan-200 font-extrabold">
            THIS WEEK'S TOTAL PRIZE POOL
          </span>
          <div className="text-2xl font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-0.5">
            ₱50,000.00
          </div>
          <span className="text-[10px] text-white/70 block mt-0.5">
            Top 100 players win cash prizes every Sunday 11:59 PM!
          </span>
        </div>

        {/* User Rank Card */}
        <div className="p-2.5 mb-3 rounded-xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-cyan-500/30 text-cyan-200 font-black text-xs flex items-center justify-center border border-cyan-400/50">
              #42
            </span>
            <div>
              <span className="text-xs font-bold text-white block truncate max-w-[170px]">{displayName}</span>
              <span className="text-[10px] text-cyan-300 font-mono">Total Winnings: ₱{currentWinnings.toFixed(2)}</span>
            </div>
          </div>
          <span className="text-[11px] font-extrabold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
            Top 5%
          </span>
        </div>

        {/* Ranking List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
          {LEADERBOARD.map((user) => (
            <div
              key={user.rank}
              className={`p-2.5 rounded-xl flex items-center justify-between border transition-all ${
                user.rank === 1
                  ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-400/60'
                  : user.rank === 2
                  ? 'bg-slate-800/60 border-slate-400/40'
                  : user.rank === 3
                  ? 'bg-amber-950/40 border-amber-600/40'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  {user.rank === 1 ? (
                    <Crown className="w-6 h-6 text-yellow-400 fill-amber-300" />
                  ) : user.rank === 2 ? (
                    <Medal className="w-5 h-5 text-slate-300 fill-slate-200" />
                  ) : user.rank === 3 ? (
                    <Medal className="w-5 h-5 text-amber-600 fill-amber-500" />
                  ) : (
                    <span className="text-xs font-black text-white/70">#{user.rank}</span>
                  )}
                </div>

                {/* Avatar & Name */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{user.avatar}</span>
                    <span className="text-xs font-bold text-white">{user.name}</span>
                  </div>
                  {user.badge && (
                    <span className="text-[9px] font-extrabold text-yellow-300 block mt-0.5">
                      {user.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <span className="text-sm font-black text-yellow-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                ₱{user.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

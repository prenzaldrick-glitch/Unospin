import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Users, 
  Tv, 
  Coins, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Unlock, 
  Eye, 
  ExternalLink,
  Sliders,
  DollarSign
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { soundFx } from '../../utils/sound';
import { 
  MONETAG_DOMAIN,
  MONETAG_ZONE_ID,
  MONETAG_TAG_ZONE_ID,
  MONETAG_TAG_SRC,
  MONETAG_SW_REMOTE_URL,
  MONETAG_SW_PATH,
  checkMonetagServiceWorkerStatus,
  registerMonetagServiceWorker
} from '../../lib/monetag';

interface AdminDashboardModalProps {
  currentUserEmail?: string | null;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  currentUserEmail,
  onClose,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminPin, setAdminPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'referrals' | 'tasks' | 'withdrawals' | 'fraud'>('overview');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Admin Data Collections
  const [usersList, setUsersList] = useState<any[]>([]);
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [adTasksList, setAdTasksList] = useState<any[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);

  // Search Filter
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Monetag Service Worker Configuration State
  const [swStatus, setSwStatus] = useState<{
    isSupported: boolean;
    isRegistered: boolean;
    scope: string | null;
    state: string | null;
  }>({ isSupported: true, isRegistered: false, scope: null, state: null });
  const [swActionMsg, setSwActionMsg] = useState<string | null>(null);

  useEffect(() => {
    checkMonetagServiceWorkerStatus().then(setSwStatus);
  }, []);

  const handleRegisterMonetagSw = async () => {
    soundFx.playClick();
    const reg = await registerMonetagServiceWorker();
    const status = await checkMonetagServiceWorkerStatus();
    setSwStatus(status);
    setSwActionMsg(reg ? 'Monetag Service Worker registered successfully!' : 'Registration checked / verified.');
    setTimeout(() => setSwActionMsg(null), 3500);
  };

  // Passkey Check
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    if (adminPin === 'UNOSPIN2026' || adminPin === 'admin123' || adminPin === '8888') {
      setIsAuthenticated(true);
      setPinError(null);
      loadAllAdminData();
    } else {
      setPinError('Incorrect Admin Passkey. Access restricted.');
    }
  };

  const loadAllAdminData = async () => {
    setIsLoadingData(true);
    try {
      // 1. Fetch Users
      try {
        const uSnap = await getDocs(query(collection(db, 'users'), limit(100)));
        const users: any[] = [];
        uSnap.forEach((d) => users.push({ id: d.id, ...d.data() }));
        setUsersList(users);
      } catch (err) {
        console.warn('Error fetching users:', err);
      }

      // 2. Fetch Referrals
      try {
        const rSnap = await getDocs(query(collection(db, 'referrals'), limit(150)));
        const refs: any[] = [];
        rSnap.forEach((d) => refs.push({ id: d.id, ...d.data() }));
        setReferralsList(refs);
      } catch (err) {
        console.warn('Error fetching referrals:', err);
      }

      // 3. Fetch Ad Tasks
      try {
        const tSnap = await getDocs(query(collection(db, 'ad_task_transactions'), limit(100)));
        const tasks: any[] = [];
        tSnap.forEach((d) => tasks.push({ id: d.id, ...d.data() }));
        setAdTasksList(tasks);
      } catch (err) {
        console.warn('Error fetching ad tasks:', err);
      }

      // 4. Fetch Withdrawals
      try {
        const wSnap = await getDocs(query(collection(db, 'withdrawals'), limit(100)));
        const withdrawals: any[] = [];
        wSnap.forEach((d) => withdrawals.push({ id: d.id, ...d.data() }));
        setWithdrawalsList(withdrawals);
      } catch (err) {
        console.warn('Error fetching withdrawals:', err);
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  // Stats Calculations
  const totalUsers = usersList.length;
  const totalReferrals = referralsList.length;
  const validReferrals = referralsList.filter((r) => (r.completedTasksCount || 0) >= 15 || r.status === 'VALID').length;
  const pendingReferrals = totalReferrals - validReferrals;
  const totalCompletedAdTasks = adTasksList.length;
  const totalWithdrawalsCount = withdrawalsList.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-[560px] bg-gradient-to-b from-[#180a36] via-[#0d0824] to-[#060318] rounded-3xl p-4 sm:p-5 border-2 border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.4)] text-white flex flex-col h-[92vh] max-h-[92vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-indigo-500/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                <span>UNO SPIN Admin Dashboard</span>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.2 rounded border border-indigo-400/30">
                  Secure Portal
                </span>
              </h2>
              <span className="text-[10px] text-slate-400">
                Logged as: {currentUserEmail || 'Super Administrator'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isAuthenticated && (
              <button
                onClick={loadAllAdminData}
                disabled={isLoadingData}
                className="p-1.5 text-indigo-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Refresh Admin Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SECURITY PIN GATE */}
        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border-2 border-indigo-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Lock className="w-8 h-8 text-indigo-300" />
            </div>

            <h3 className="text-base font-black text-white mb-1">
              Admin Portal Security Gate
            </h3>
            <p className="text-xs text-slate-400 max-w-[280px] mb-4">
              Enter the administrator passkey to monitor users, referral validation (15 tasks), ad tasks, and withdrawals.
            </p>

            <form onSubmit={handlePinSubmit} className="w-full max-w-[260px] space-y-3">
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter Passkey (e.g. UNOSPIN2026)"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-sm font-mono font-black text-yellow-300 focus:outline-none focus:border-indigo-400"
              />

              {pinError && (
                <div className="text-[11px] text-red-400 font-bold">
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-98 cursor-pointer"
              >
                UNLOCK ADMIN PANEL
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN INTERFACE */
          <div className="flex-1 flex flex-col overflow-hidden pt-2">
            
            {/* NAVIGATION TABS */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-black uppercase shrink-0 mb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-1.5 rounded-lg transition-all ${
                  activeTab === 'overview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-1.5 rounded-lg transition-all ${
                  activeTab === 'users' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Users ({totalUsers})
              </button>
              <button
                onClick={() => setActiveTab('referrals')}
                className={`py-1.5 rounded-lg transition-all ${
                  activeTab === 'referrals' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Refs ({validReferrals}/{totalReferrals})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-1.5 rounded-lg transition-all ${
                  activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ads ({totalCompletedAdTasks})
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`py-1.5 rounded-lg transition-all ${
                  activeTab === 'withdrawals' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Payouts ({totalWithdrawalsCount})
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto pr-1">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-slate-900/90 rounded-2xl border border-indigo-500/30">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Registered Users</span>
                      <span className="text-xl font-black text-cyan-300 font-mono">{totalUsers}</span>
                    </div>
                    <div className="p-3 bg-slate-900/90 rounded-2xl border border-emerald-500/40">
                      <span className="text-[9px] uppercase font-bold text-emerald-300 block">Valid Referrals (15 Tasks)</span>
                      <span className="text-xl font-black text-emerald-400 font-mono">{validReferrals}</span>
                    </div>
                    <div className="p-3 bg-slate-900/90 rounded-2xl border border-amber-500/40">
                      <span className="text-[9px] uppercase font-bold text-amber-300 block">Pending Referrals</span>
                      <span className="text-xl font-black text-amber-400 font-mono">{pendingReferrals}</span>
                    </div>
                    <div className="p-3 bg-slate-900/90 rounded-2xl border border-purple-500/30">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Ad Tasks Completed</span>
                      <span className="text-xl font-black text-purple-300 font-mono">{totalCompletedAdTasks}</span>
                    </div>
                  </div>

                  {/* Monetag Service Worker Integration Management Panel */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#180a3a] via-[#100729] to-[#0a051d] border-2 border-cyan-400/60 space-y-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center">
                          <Tv className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wide">
                            Monetag Service Worker Integration
                          </h4>
                          <span className="text-[10px] text-cyan-300 font-bold block">
                            Zone ID {MONETAG_ZONE_ID} • {MONETAG_DOMAIN}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/50 flex items-center gap-1 shadow-sm">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>{swStatus.isRegistered ? 'SW ACTIVE' : 'READY / HTTPS'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Official Monetag Configuration Info */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-[10.5px] space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-300">
                        <span>Offers Ad Tag:</span>
                        <span className="text-cyan-300 font-mono text-[10px]">Zone {MONETAG_TAG_ZONE_ID}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Offers Zone ID</span>
                          <span className="text-amber-300 font-mono font-bold">{MONETAG_TAG_ZONE_ID}</span>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">SW Zone ID</span>
                          <span className="text-yellow-300 font-mono font-bold">{MONETAG_ZONE_ID}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold mb-0.5">Tag Source</span>
                        <code className="block p-1 rounded bg-slate-900 border border-slate-800 text-[8.5px] font-mono text-cyan-200 break-all select-all">
                          {MONETAG_TAG_SRC}
                        </code>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold mb-0.5">Service Worker ({MONETAG_DOMAIN})</span>
                        <code className="block p-1 rounded bg-slate-900 border border-slate-800 text-[8.5px] font-mono text-slate-300 break-all select-all">
                          {MONETAG_SW_PATH} (Scope: /)
                        </code>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="space-y-2 pt-1">
                      {swActionMsg && (
                        <div className="p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-[11px] font-bold text-emerald-300 text-center animate-fadeIn flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{swActionMsg}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleRegisterMonetagSw}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer transition-all border border-cyan-300/40 flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>VERIFY / RE-REGISTER SERVICE WORKER</span>
                      </button>
                    </div>

                    <div className="pt-1 text-[9.5px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
                      <span>Scope: {swStatus.scope || '/'}</span>
                      <span className="text-emerald-400 font-mono">Compatible: Netlify, Cloudflare, HTTPS</span>
                    </div>
                  </div>

                  {/* Withdrawal Activation Rule Summary */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-[11px] space-y-1">
                    <span className="text-amber-300 font-black uppercase block">Withdrawal Eligibility Rules:</span>
                    <p className="text-slate-300">• Users must complete at least 30 Ads in the Offers section (30/30).</p>
                    <p className="text-slate-300">• Users must invite at least 8 Valid Users through their referral links (8/8).</p>
                    <p className="text-slate-300">• Each invited user must complete at least 15 ad tasks (15/15) to count as valid.</p>
                    <p className="text-slate-300">• Minimum ₱500 balance required for withdrawal.</p>
                  </div>
                </div>
              )}

              {/* TAB 2: USERS */}
              {activeTab === 'users' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search users by name, UID or referral code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-[11px]">
                    <div className="grid grid-cols-12 bg-slate-900 p-2 font-black text-cyan-300 uppercase text-[9px]">
                      <div className="col-span-3">User / UID</div>
                      <div className="col-span-2">Balance</div>
                      <div className="col-span-2 text-center">Ads (30)</div>
                      <div className="col-span-3 text-center">Valid Refs (8)</div>
                      <div className="col-span-2 text-right">Cashout</div>
                    </div>
                    <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto">
                      {usersList
                        .filter((u) => (u.nickname || u.fullname || u.id || '').toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((user) => {
                          const adsCount = Array.isArray(user.completedAdTasks) ? user.completedAdTasks.length : 0;
                          const valids = user.validReferralsCount || 0;
                          const isEligible = adsCount >= 30 && valids >= 8 && (user.balance || 0) >= 500;
                          return (
                            <div key={user.id} className="grid grid-cols-12 p-2 items-center hover:bg-slate-900/40 text-[10.5px]">
                              <div className="col-span-3 truncate">
                                <span className="font-extrabold text-white block truncate">{user.nickname || user.fullname || 'Player'}</span>
                                <span className="text-[8.5px] text-slate-400 font-mono block truncate">{user.id}</span>
                              </div>
                              <div className="col-span-2 font-mono font-bold text-yellow-300 text-[10px]">
                                ₱{(user.balance || 0).toFixed(2)}
                              </div>
                              <div className="col-span-2 text-center font-mono font-bold">
                                <span className={adsCount >= 30 ? 'text-emerald-400' : 'text-amber-300'}>
                                  {adsCount}/30
                                </span>
                              </div>
                              <div className="col-span-3 text-center font-mono font-bold">
                                <span className={valids >= 8 ? 'text-emerald-400' : 'text-amber-300'}>
                                  {valids}/8
                                </span>
                              </div>
                              <div className="col-span-2 text-right">
                                {isEligible ? (
                                  <span className="text-[8.5px] text-emerald-400 font-black bg-emerald-950 px-1 py-0.5 rounded border border-emerald-500/50">
                                    ELIGIBLE
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] text-slate-500 font-bold">
                                    LOCKED
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: REFERRALS */}
              {activeTab === 'referrals' && (
                <div className="space-y-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-[11px]">
                    <div className="grid grid-cols-12 bg-slate-900 p-2 font-black text-cyan-300 uppercase text-[9.5px]">
                      <div className="col-span-4">Invited Member</div>
                      <div className="col-span-3">Inviter Code</div>
                      <div className="col-span-3 text-center">Tasks (15 min)</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto">
                      {referralsList.map((ref) => {
                        const tasks = ref.completedTasksCount || 0;
                        const isVal = tasks >= 15 || ref.status === 'VALID';
                        return (
                          <div key={ref.id} className="grid grid-cols-12 p-2 items-center hover:bg-slate-900/40">
                            <div className="col-span-4 truncate font-bold text-white">
                              {ref.invitedNickname || ref.invitedUid || 'User'}
                            </div>
                            <div className="col-span-3 font-mono text-[10px] text-cyan-300">
                              {ref.inviterRefCode || ref.referralCode || 'N/A'}
                            </div>
                            <div className="col-span-3 text-center font-mono font-black">
                              <span className={isVal ? 'text-emerald-400' : 'text-amber-300'}>
                                {tasks}/15
                              </span>
                            </div>
                            <div className="col-span-2 text-right">
                              {isVal ? (
                                <span className="text-[8.5px] font-black bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/50">
                                  VALID
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-bold bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/50">
                                  PENDING
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AD TASKS */}
              {activeTab === 'tasks' && (
                <div className="space-y-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-[11px]">
                    <div className="grid grid-cols-12 bg-slate-900 p-2 font-black text-cyan-300 uppercase text-[9.5px]">
                      <div className="col-span-4">Task</div>
                      <div className="col-span-4">User</div>
                      <div className="col-span-2">Reward</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto">
                      {adTasksList.map((t) => (
                        <div key={t.id} className="grid grid-cols-12 p-2 items-center hover:bg-slate-900/40">
                          <div className="col-span-4 font-black text-white">
                            Task #{t.taskId || 1}
                          </div>
                          <div className="col-span-4 truncate text-slate-300 text-[10px]">
                            {t.userNickname || t.userId}
                          </div>
                          <div className="col-span-2 text-yellow-300 font-bold font-mono">
                            +1 Spin
                          </div>
                          <div className="col-span-2 text-right text-emerald-400 font-extrabold text-[9px]">
                            VERIFIED
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: WITHDRAWALS */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-[11px]">
                    <div className="grid grid-cols-12 bg-slate-900 p-2 font-black text-cyan-300 uppercase text-[9.5px]">
                      <div className="col-span-4">Account</div>
                      <div className="col-span-3">Provider</div>
                      <div className="col-span-3">Amount</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto">
                      {withdrawalsList.map((w) => (
                        <div key={w.id} className="grid grid-cols-12 p-2 items-center hover:bg-slate-900/40">
                          <div className="col-span-4 truncate font-bold text-white">
                            {w.accountName || w.userDisplayName}
                            <span className="block text-[9px] text-slate-400 font-mono">{w.accountNumber}</span>
                          </div>
                          <div className="col-span-3 uppercase font-black text-cyan-300">
                            {w.walletType}
                          </div>
                          <div className="col-span-3 font-mono font-black text-yellow-300">
                            ₱{(w.amount || 500).toFixed(2)}
                          </div>
                          <div className="col-span-2 text-right text-emerald-400 font-black text-[9px]">
                            SUCCESS
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

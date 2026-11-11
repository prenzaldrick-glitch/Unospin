import React, { useState, useEffect } from 'react';
import { Sparkles, User, Lock, Tag, UserCheck, LogIn, UserPlus, AlertCircle, RefreshCw } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { soundFx } from '../utils/sound';

import { 
  createReferralRecordInFirebase, 
  detectReferralCodeFromUrl,
  generateUniqueReferralCode,
  saveLocalReferral 
} from '../lib/referrals';

interface AuthScreenProps {
  onSuccess: (uid?: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  
  // Registration Form State
  const [fullname, setFullname] = useState('');
  const [nickname, setNickname] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Login Form State
  const [loginNickname, setLoginNickname] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detectedFromLink, setDetectedFromLink] = useState(false);

  // Auto-detect referral code from URL `ref` parameter or localStorage
  useEffect(() => {
    const detected = detectReferralCodeFromUrl();
    if (detected) {
      setReferralCode(detected);
      setMode('register');
      setDetectedFromLink(true);
    }
  }, []);

  // Helper to generate unique referral code
  const generateReferralCode = (nick: string) => {
    return generateUniqueReferralCode(nick);
  };

  // Helper to format email from nickname
  const formatEmailFromNickname = (nick: string) => {
    const cleanNick = nick.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeNick = cleanNick || `user_${Date.now()}`;
    return `${safeNick}@unospincash.app`;
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setError(null);

    const trimmedFullname = fullname.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedFullname) {
      setError('Please enter your full name.');
      return;
    }
    if (!trimmedNickname) {
      setError('Please enter a nickname / username.');
      return;
    }
    if (trimmedNickname.length < 3) {
      setError('Nickname must be at least 3 characters.');
      return;
    }
    if (!regPassword) {
      setError('Please enter a password.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const newRefCode = generateReferralCode(trimmedNickname);
      const trimmedRef = referralCode.trim().toUpperCase();
      const validReferralCode = (trimmedRef && trimmedRef !== newRefCode) ? trimmedRef : null;

      // 1. Read local accounts
      const existingAccountsStr = localStorage.getItem('usc_local_accounts') || '[]';
      let accounts: any[] = [];
      try {
        accounts = JSON.parse(existingAccountsStr);
      } catch {
        accounts = [];
      }

      const nickExists = accounts.some(
        (a: any) => a.nickname?.toLowerCase() === trimmedNickname.toLowerCase()
      );

      if (nickExists) {
        setError('Nickname is already registered. Please choose another or login.');
        setLoading(false);
        return;
      }

      // Check Firestore to ensure nickname is globally unique
      try {
        const usersRef = collection(db, 'users');
        const qNick = query(usersRef, where('nicknameLower', '==', trimmedNickname.toLowerCase()));
        const snap = await getDocs(qNick);
        if (!snap.empty) {
          setError('Nickname is already registered. Please choose another or login.');
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Notice checking nickname uniqueness in Firebase:', e);
      }

      const activeUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const userDocData = {
        uid: activeUid,
        fullname: trimmedFullname,
        nickname: trimmedNickname,
        nicknameLower: trimmedNickname.toLowerCase(),
        password: regPassword,
        referralCode: newRefCode,
        referredBy: validReferralCode,
        inviterUid: validReferralCode,
        spinCount: 2,
        spins: 2,
        balance: 0,
        cycleSpinCount: 0,
        regRewardClaimed: true,
        betfuguSubmissionAttempts: 0,
        betfuguTaskCompleted: false,
        betfuguRewardGranted: false,
        colorgameSubmissionAttempts: 0,
        colorgameTaskCompleted: false,
        colorgameRewardGranted: false,
        telegramTaskCompleted: false,
        completedAdTasks: [],
        currentAdTaskLevel: 1,
        totalAdRewardsEarned: 0,
        createdAt: new Date().toISOString(),
      };

      // 2. Save locally and navigate immediately to lobby
      accounts.push(userDocData);
      localStorage.setItem('usc_local_accounts', JSON.stringify(accounts));
      localStorage.setItem('usc_user_uid', activeUid);
      localStorage.setItem(`usc_user_profile_${activeUid}`, JSON.stringify(userDocData));
      localStorage.setItem(`uno_user_ref_code_${activeUid}`, newRefCode);
      localStorage.removeItem('uno_pending_ref_code');
      localStorage.removeItem('usc_pending_ref_code');

      // 3. Connect to local referral system
      if (validReferralCode) {
        saveLocalReferral(validReferralCode, activeUid, trimmedNickname);
      }

      // Save user doc to Firebase `users` collection for permanent persistence
      try {
        await setDoc(doc(db, 'users', activeUid), userDocData, { merge: true });
      } catch (err) {
        console.warn('Notice saving user document to Firebase:', err);
      }

      // Create Firebase referral relationship record if registered via a referral code
      if (validReferralCode) {
        try {
          await createReferralRecordInFirebase(validReferralCode, activeUid, trimmedNickname);
        } catch (err) {
          console.warn('Notice creating referral record in Firebase:', err);
        }
      }

      soundFx.playWin();
      onSuccess(activeUid);
    } catch (err: any) {
      console.error('Registration notice:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setError(null);

    const trimmedLoginNick = loginNickname.trim();

    if (!trimmedLoginNick) {
      setError('Please enter your nickname or username.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Check local saved accounts first
      const existingAccountsStr = localStorage.getItem('usc_local_accounts') || '[]';
      let accounts: any[] = [];
      try {
        accounts = JSON.parse(existingAccountsStr);
      } catch {
        accounts = [];
      }

      const matchedAccount = accounts.find(
        (a: any) => a.nickname?.toLowerCase() === trimmedLoginNick.toLowerCase()
      );

      if (matchedAccount) {
        if (matchedAccount.password && matchedAccount.password !== loginPassword) {
          setError('Incorrect password.');
          setLoading(false);
          return;
        }
        localStorage.setItem('usc_user_uid', matchedAccount.uid);
        soundFx.playClick();
        onSuccess(matchedAccount.uid);
        setLoading(false);
        return;
      }

      // 2. Query Firestore users collection so accounts persist across browsers / cache clears
      const usersRef = collection(db, 'users');
      let remoteUser: any = null;
      try {
        const q1 = query(usersRef, where('nicknameLower', '==', trimmedLoginNick.toLowerCase()));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          remoteUser = snap1.docs[0].data();
        } else {
          const q2 = query(usersRef, where('nickname', '==', trimmedLoginNick));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            remoteUser = snap2.docs[0].data();
          }
        }
      } catch (err) {
        console.warn('Notice querying user for login from Firebase:', err);
      }

      if (remoteUser) {
        if (remoteUser.password && remoteUser.password !== loginPassword) {
          setError('Incorrect password.');
          setLoading(false);
          return;
        }

        // Restore user to localStorage so nothing is reset
        localStorage.setItem('usc_user_uid', remoteUser.uid);
        localStorage.setItem(`usc_user_profile_${remoteUser.uid}`, JSON.stringify(remoteUser));
        accounts.push(remoteUser);
        localStorage.setItem('usc_local_accounts', JSON.stringify(accounts));

        soundFx.playClick();
        onSuccess(remoteUser.uid);
        return;
      }

      // If account does not exist, do not silently create a blank account and wipe data
      setError('Account not found. Please check your nickname or register a new account.');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full max-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-indigo-950 via-purple-950 to-blue-950 overflow-y-auto select-none">
      
      {/* APP LOGO & BRANDING */}
      <div className="flex flex-col items-center text-center mb-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-red-600 p-1 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.5)] border-2 border-yellow-200 mb-2">
          <Sparkles className="w-10 h-10 text-white fill-amber-200" />
        </div>
        
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-wider font-sans uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          UNO SPIN CASH PHP
        </h1>
        <p className="text-xs font-bold text-cyan-300 tracking-wide mt-0.5">
          Spin the Wheel & Win Real Cash Daily!
        </p>
      </div>

      {/* AUTH CARD */}
      <div className="w-full max-w-[380px] bg-slate-900/90 rounded-3xl p-5 border-2 border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.3)] text-white backdrop-blur-md">
        
        {/* LOGIN / REGISTER TOGGLE TABS */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-amber-500/30 mb-4">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setMode('login');
              setError(null);
            }}
            className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md border border-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>LOGIN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setMode('register');
              setError(null);
            }}
            className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md border border-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>REGISTER</span>
          </button>
        </div>

        {/* REFERRAL LINK DETECTED BANNER */}
        {detectedFromLink && referralCode && (
          <div className="mb-3 p-3 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/80 text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn shadow-lg shadow-emerald-950/50">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
            <div className="flex-1">
              <span className="block font-black text-white text-xs">Invite Link Detected!</span>
              <span className="text-[11px] text-emerald-300">
                Invited by code: <span className="font-mono text-amber-300 font-black px-1.5 py-0.5 bg-amber-400/10 rounded border border-amber-400/30">{referralCode}</span>
              </span>
            </div>
          </div>
        )}

        {/* ERROR DISPLAY */}
        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-950/90 border border-red-500/80 text-red-200 text-xs font-bold flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-3">
            {/* Fullname */}
            <div>
              <label className="block text-[11px] font-extrabold text-amber-300 uppercase tracking-wide mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-bold"
                />
              </div>
            </div>

            {/* Nickname / Username */}
            <div>
              <label className="block text-[11px] font-extrabold text-amber-300 uppercase tracking-wide mb-1">
                Nickname / Username
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. juan88"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-bold"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-extrabold text-amber-300 uppercase tracking-wide mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-bold"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-extrabold text-amber-300 uppercase tracking-wide mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-bold"
                />
              </div>
            </div>

            {/* Referral Code */}
            <div>
              <label className="block text-[11px] font-extrabold text-amber-300 uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Referral Code</span>
                {referralCode ? (
                  <span className="text-emerald-400 font-black text-[10px] flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Code Detected
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold text-[10px]">Optional</span>
                )}
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter referral code if any"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono font-bold uppercase"
                />
              </div>
            </div>

            {/* REGISTER BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950/80 border border-yellow-200 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Start</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-3">
            {/* Nickname / Username */}
            <div>
              <label className="block text-[11px] font-extrabold text-amber-300 uppercase tracking-wide mb-1">
                Nickname / Username
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Enter your nickname"
                  value={loginNickname}
                  onChange={(e) => setLoginNickname(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-bold"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-extrabold text-amber-300 uppercase tracking-wide mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-bold"
                />
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950/80 border border-yellow-200 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Login to Lobby</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>

      <p className="text-[11px] text-slate-400 mt-4 text-center font-bold">
        Uno Spin Cash PHP • Real-time Firebase Authentication
      </p>

    </div>
  );
};

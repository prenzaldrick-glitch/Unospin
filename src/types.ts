export interface WheelSegment {
  id: number;
  label: string;
  type: 'cash_500' | 'mini' | 'mega' | 'double' | 'random' | 'iphone' | 'medium';
  valueText: string;
  subText?: string;
  color: string;
  textColor: string;
  iconType: 'peso' | 'coins' | 'bag' | 'double' | 'question' | 'iphone' | 'stack';
}

export interface BoundWallet {
  type: 'gcash' | 'maya';
  number: string;
  name: string;
  boundAt?: string;
}

export interface WithdrawalRecord {
  id: string;
  uid: string;
  userDisplayName: string;
  walletType: 'gcash' | 'maya';
  accountNumber: string;
  accountName: string;
  amount: number;
  status: 'Success';
  timestamp: string;
  formattedDate: string;
  formattedTime: string;
  createdAt: number;
}

export type AdTaskStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'active';

export interface AdTask {
  id: number;
  title: string;
  rewardType: 'spins' | 'cash' | 'combo';
  rewardSpins: number;
  rewardCash: number;
  rewardLabel: string;
  status: AdTaskStatus;
  instructions: string;
  isMilestone?: boolean;
}

export interface AdTaskTransaction {
  id: string;
  userId: string;
  userNickname?: string;
  taskId: number;
  rewardSpins: number;
  rewardCash: number;
  rewardLabel: string;
  zoneId?: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  completedAt: string;
}

export interface MonetagConfig {
  domain: string;
  swZoneId: number | string;
  tagZoneId: string;
  tagSrc: string;
  serviceWorkerUrl: string;
  isRegistered: boolean;
  registrationScope?: string;
  isTagLoaded?: boolean;
}

export interface AdminDashboardStats {
  totalRegisteredUsers: number;
  totalReferrals: number;
  validReferrals: number;
  activeUsersToday: number;
  completedAdTasks: number;
  totalApprovedRewardsSpins: number;
  totalApprovedRewardsCash: number;
}

export interface UserState {
  uid?: string;
  fullname?: string;
  nickname?: string;
  referralCode?: string;
  referredBy?: string | null;
  inviterUid?: string | null;
  boundWallet?: BoundWallet | null;
  balance: number;
  spins: number;
  cycleSpinCount: number;
  userId: string;
  isDoubleNext: boolean;
  iphoneFragments: number; // e.g. out of 5
  noAnimation: boolean;
  soundEnabled: boolean;
  invitedCount: number;
  regRewardClaimed?: boolean;
  // 100 Spin Tasks progression
  completedAdTasks?: number[];
  currentAdTaskLevel?: number;
  totalAdRewardsEarned?: number;
  // Tasks persistence
  betfuguSubmissionAttempts?: number;
  betfuguTaskCompleted?: boolean;
  betfuguRewardGranted?: boolean;
  colorgameSubmissionAttempts?: number;
  colorgameTaskCompleted?: boolean;
  colorgameRewardGranted?: boolean;
  // Withdrawal & Referral Activation
  validReferralsCount?: number;
  withdrawalUnlocked?: boolean;
}

export interface ReferredUserInfo {
  uid: string;
  nickname: string;
  fullname: string;
  betfuguCompleted?: boolean;
  colorgameCompleted?: boolean;
  telegramCompleted?: boolean;
  completedTasksCount?: number;
  isValid: boolean;
  createdAt?: string;
}

export interface ReferralRecord {
  id: string;
  inviterUid?: string;
  inviterRefCode?: string;
  invitedUid: string;
  invitedNickname: string;
  referralCode: string;
  status: 'PENDING' | 'VALID' | 'NOT VALID';
  betfuguCompleted?: boolean;
  betfuguVerified?: boolean;
  colorgameCompleted?: boolean;
  colorgameVerified?: boolean;
  telegramCompleted?: boolean;
  completedTasksCount?: number;
  rewardClaimedByInviter?: boolean;
  referralRewardGranted?: boolean;
  createdAt: string;
  validatedAt?: string | null;
  updatedAt?: string;
}

export interface RecentWinner {
  id: string;
  phone: string;
  prize: string;
  time: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  amount: number;
  badge?: string;
}

export type ModalType = 
  | null 
  | 'ranking' 
  | 'invites' 
  | 'cashout' 
  | 'prize' 
  | 'more' 
  | 'recharge' 
  | 'buy_spins' 
  | 'add_spin' 
  | 'win_result'
  | 'daily_checkin'
  | 'offers'
  | 'betfugu_task'
  | 'colorgame_task'
  | 'admin'
  | 'ad_viewer';

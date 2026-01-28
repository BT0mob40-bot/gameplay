export type AppRole = 'admin' | 'user';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus' | 'adjustment';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference: string | null;
  mpesa_receipt: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  game_type: 'mines' | 'crash';
  bet_amount: number;
  multiplier: number;
  payout: number;
  status: 'active' | 'won' | 'lost' | 'cashed_out';
  game_data: any;
  created_at: string;
  ended_at: string | null;
}

export interface Bonus {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  bonus_type: 'welcome' | 'deposit' | 'manual' | 'promotional';
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface UserBonus {
  id: string;
  user_id: string;
  bonus_id: string;
  amount: number;
  status: 'pending' | 'claimed' | 'expired';
  claimed_at: string | null;
  created_at: string;
  bonus?: Bonus;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  welcome_bonus_amount: number;
  welcome_bonus_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MpesaSettings {
  id: string;
  paybill_number: string | null;
  account_name: string | null;
  consumer_key: string | null;
  consumer_secret: string | null;
  passkey: string | null;
  callback_url: string | null;
  is_sandbox: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithDetails {
  id: string;
  email: string;
  profile: Profile | null;
  wallet: Wallet | null;
  role: UserRole | null;
  is_suspended?: boolean;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  role: 'admin' | 'member';
  created_at: string;
};

export type Member = {
  id: string;
  member_id: string;
  full_name: string;
  phone: string;
  address?: string;
  joining_date: string;
  status: 'active' | 'inactive';
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  member_id: string;
  amount: number;
  payment_month: number;
  payment_year: number;
  payment_date: string;
  payment_method: 'cash' | 'upi' | 'bank_transfer';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Wallet } from '@/types/database';

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setWallet(data as Wallet);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Auto-refresh balance every second for real-time sync
  useEffect(() => {
    if (!user) return;

    // Fetch immediately and then every second
    fetchWallet();
    intervalRef.current = setInterval(() => {
      fetchWallet();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, fetchWallet]);

  // Real-time subscription for instant balance updates (backup)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Wallet updated in real-time:', payload);
          if (payload.new) {
            setWallet(payload.new as Wallet);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const refreshWallet = useCallback(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Deduct bet using server-side function (instant, secure)
  const deductBet = useCallback(async (amount: number): Promise<boolean> => {
    if (!user) return false;
    
    // Optimistic update for instant UI feedback
    setWallet(prev => prev ? { ...prev, balance: prev.balance - amount } : null);

    try {
      const { data, error } = await supabase.rpc('deduct_bet', {
        p_user_id: user.id,
        p_amount: amount
      });

      if (error) {
        console.error('Error deducting bet:', error);
        fetchWallet(); // Revert on error
        return false;
      }

      if (!data) {
        fetchWallet(); // Revert if insufficient balance
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deducting bet:', error);
      fetchWallet();
      return false;
    }
  }, [user, fetchWallet]);

  // Add winnings using server-side function (instant, secure)
  const addWinnings = useCallback(async (amount: number): Promise<boolean> => {
    if (!user) return false;
    
    // Optimistic update for instant UI feedback
    setWallet(prev => prev ? { ...prev, balance: prev.balance + amount } : null);

    try {
      const { error } = await supabase.rpc('add_winnings', {
        p_user_id: user.id,
        p_amount: amount
      });

      if (error) {
        console.error('Error adding winnings:', error);
        fetchWallet();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error adding winnings:', error);
      fetchWallet();
      return false;
    }
  }, [user, fetchWallet]);

  return { wallet, loading, refreshWallet, deductBet, addWinnings };
}

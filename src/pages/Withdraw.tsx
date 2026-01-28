import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowDownRight, ArrowLeft, Clock, Zap, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WithdrawalRequest } from '@/types/database';

const MIN_WITHDRAWAL = 100; // Minimum withdrawal limit

export default function Withdraw() {
  const { user, loading: authLoading } = useAuth();
  const { wallet, refreshWallet } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [amount, setAmount] = useState(MIN_WITHDRAWAL);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPendingWithdrawals();
    }
  }, [user]);

  const fetchPendingWithdrawals = async () => {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setPendingWithdrawals(data as WithdrawalRequest[]);
  };

  const submitWithdrawal = async () => {
    if (!phone || phone.length < 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid M-Pesa phone number.',
        variant: 'destructive',
      });
      return;
    }

    if (amount < MIN_WITHDRAWAL) {
      toast({
        title: `Minimum withdrawal is KES ${MIN_WITHDRAWAL}`,
        description: `Please enter an amount of at least KES ${MIN_WITHDRAWAL}.`,
        variant: 'destructive',
      });
      return;
    }

    if (!wallet || wallet.balance < amount) {
      toast({
        title: 'Insufficient balance',
        description: 'You do not have enough funds to withdraw.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Deduct from wallet immediately
      const newBalance = wallet.balance - amount;
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user!.id);

      if (walletError) throw walletError;

      // Create withdrawal request
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user!.id,
          amount,
          phone,
          status: 'pending',
        });

      if (error) throw error;

      // Create pending transaction
      await supabase.from('transactions').insert({
        user_id: user!.id,
        type: 'withdrawal',
        amount: -amount,
        status: 'pending',
        description: `Withdrawal request to ${phone}`,
      });

      toast({
        title: 'Withdrawal Requested',
        description: 'Your withdrawal is being processed instantly!',
      });

      fetchPendingWithdrawals();
      refreshWallet();
      setAmount(MIN_WITHDRAWAL);
      setPhone('');
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit withdrawal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxWithdraw = wallet?.balance || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-md">
          <Button variant="ghost" className="mb-6" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Dashboard
          </Button>

          {/* Instant Processing Banner */}
          <Card className="glass-card mb-6 border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-primary">Instant Processing</p>
                <p className="text-sm text-muted-foreground">Withdrawals are processed instantly!</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Withdrawals */}
          {pendingWithdrawals.length > 0 && (
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" />
                  Recent Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingWithdrawals.slice(0, 5).map((w) => (
                  <div key={w.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium">KES {w.amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{w.phone}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                      w.status === 'approved' 
                        ? 'bg-green-500/20 text-green-500' 
                        : w.status === 'rejected'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {w.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                      {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="glass-card">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                <ArrowDownRight className="w-8 h-8 text-orange-500" />
              </div>
              <CardTitle>Withdraw to M-Pesa</CardTitle>
              <CardDescription>
                Cash out your winnings to M-Pesa instantly
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-3xl font-bold text-primary">
                  KES {wallet?.balance?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Amount (KES)</Label>
                  <span className="text-xs text-muted-foreground">Min: KES {MIN_WITHDRAWAL}</span>
                </div>
                <Input
                  type="number"
                  min={MIN_WITHDRAWAL}
                  max={maxWithdraw}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(MIN_WITHDRAWAL, Math.min(maxWithdraw, Number(e.target.value))))}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(Math.min(maxWithdraw, 500))}
                  >
                    500
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(Math.min(maxWithdraw, 1000))}
                  >
                    1000
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(maxWithdraw)}
                  >
                    Max
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>M-Pesa Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="254712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span>KES {amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>You'll Receive</span>
                  <span className="text-primary">KES {amount.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={submitWithdrawal}
                disabled={loading || amount < MIN_WITHDRAWAL || amount > maxWithdraw}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Request Instant Withdrawal
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                ⚡ Minimum withdrawal: KES {MIN_WITHDRAWAL} • Processed instantly by our admin team
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

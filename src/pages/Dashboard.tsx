import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Gamepad2, 
  Gift,
  History,
  Loader2,
  Sparkles,
  Rocket,
  Unlock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, UserBonus } from '@/types/database';

export default function Dashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const { wallet, loading: walletLoading, refreshWallet } = useWallet();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bonuses, setBonuses] = useState<UserBonus[]>([]);
  const [hasDeposited, setHasDeposited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimingBonus, setClaimingBonus] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && role === 'admin') {
      navigate('/admin');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch recent transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txData) setTransactions(txData as Transaction[]);

      // Check if user has made a deposit
      const deposits = txData?.filter((t: Transaction) => t.type === 'deposit' && t.status === 'completed') || [];
      setHasDeposited(deposits.length > 0);

      // Fetch unclaimed bonuses
      const { data: bonusData } = await supabase
        .from('user_bonuses')
        .select('*, bonus:bonuses(*)')
        .eq('user_id', user!.id)
        .eq('status', 'pending');

      if (bonusData) setBonuses(bonusData as UserBonus[]);

      if (bonusData) setBonuses(bonusData as UserBonus[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimBonus = async (userBonusId: string, amount: number) => {
    setClaimingBonus(userBonusId);
    try {
      // Update bonus status
      await supabase
        .from('user_bonuses')
        .update({ status: 'claimed', claimed_at: new Date().toISOString() })
        .eq('id', userBonusId);

      // Add to wallet
      const currentBalance = wallet?.balance || 0;
      await supabase
        .from('wallets')
        .update({ balance: currentBalance + amount })
        .eq('user_id', user!.id);

      // Create transaction
      await supabase.from('transactions').insert({
        user_id: user!.id,
        type: 'bonus',
        amount,
        status: 'completed',
        description: 'Welcome bonus claimed',
      });

      // Refresh data
      await refreshWallet();
      fetchData();
    } catch (error) {
      console.error('Error claiming bonus:', error);
    } finally {
      setClaimingBonus(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Wallet Balance',
      value: `KES ${wallet?.balance?.toFixed(2) || '0.00'}`,
      icon: Wallet,
      color: 'text-primary',
    },
    {
      title: 'Total Deposits',
      value: transactions
        .filter((t) => t.type === 'deposit' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0)
        .toFixed(2),
      icon: ArrowUpRight,
      color: 'text-green-500',
    },
    {
      title: 'Total Withdrawals',
      value: transactions
        .filter((t) => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        .toFixed(2),
      icon: ArrowDownRight,
      color: 'text-orange-500',
    },
    {
      title: 'Games Played',
      value: transactions.filter((t) => t.type === 'bet').length.toString(),
      icon: Gamepad2,
      color: 'text-accent',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back!</p>
            </div>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={() => navigate('/games')}
            >
              <Rocket className="mr-2 w-5 h-5" />
              Start Gambling
            </Button>
          </div>

          {/* Bonus Unlock Section */}
          {settings?.welcome_bonus_enabled && !hasDeposited && bonuses.length === 0 && (
            <Card className="mb-8 bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 border-accent/50 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-primary/5 animate-pulse" />
              <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4 relative">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center">
                    <Unlock className="w-8 h-8 text-accent animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-accent">
                      🎁 Unlock KES {settings.welcome_bonus_amount} Bonus!
                    </h3>
                    <p className="text-muted-foreground">
                      Make a deposit of KES 200+ to unlock your welcome bonus
                    </p>
                  </div>
                </div>
                <Button 
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8"
                  onClick={() => navigate('/deposit')}
                >
                  <Gift className="mr-2 w-5 h-5" />
                  Deposit to Unlock
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Unclaimed Bonuses */}
          {bonuses.length > 0 && (
            <div className="mb-8 space-y-4">
              {bonuses.map((userBonus) => (
                <Card key={userBonus.id} className="bg-gradient-to-r from-accent/20 to-primary/20 border-accent/50 animate-pulse-slow overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-primary/5" />
                  <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4 relative">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center animate-bounce">
                        <Gift className="w-8 h-8 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-accent">
                          🎁 {userBonus.bonus?.name || 'Welcome Bonus'}!
                        </h3>
                        <p className="text-lg">
                          <span className="font-bold text-2xl text-primary">KES {userBonus.amount}</span>
                          <span className="text-muted-foreground ml-2">waiting for you!</span>
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="lg"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8"
                      onClick={() => claimBonus(userBonus.id, userBonus.amount)}
                      disabled={claimingBonus === userBonus.id}
                    >
                      {claimingBonus === userBonus.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="mr-2 w-5 h-5" />
                          Claim Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.title} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <span className="text-sm text-muted-foreground">{stat.title}</span>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="glass-card hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/deposit')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Deposit</h3>
                  <p className="text-sm text-muted-foreground">Add funds via M-Pesa</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/withdraw')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <ArrowDownRight className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Withdraw</h3>
                  <p className="text-sm text-muted-foreground">Instant M-Pesa cashout</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover:border-primary/50 transition-colors cursor-pointer bg-gradient-to-br from-primary/5 to-accent/5" onClick={() => navigate('/games')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Play Games</h3>
                  <p className="text-sm text-muted-foreground">Start winning now</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No transactions yet</p>
                  <Button onClick={() => navigate('/games')}>
                    <Gamepad2 className="mr-2 w-4 h-4" />
                    Start Playing
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' 
                            ? <ArrowUpRight className="w-5 h-5" />
                            : <ArrowDownRight className="w-5 h-5" />
                          }
                        </div>
                        <div>
                          <p className="font-medium capitalize">{tx.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus'
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? '+' : '-'}
                          KES {Math.abs(tx.amount).toFixed(2)}
                        </p>
                        <p className={`text-xs capitalize ${
                          tx.status === 'completed' ? 'text-green-500' :
                          tx.status === 'pending' ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

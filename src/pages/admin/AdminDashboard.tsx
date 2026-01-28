import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, CreditCard, ArrowDownRight, Gift, Settings, LogOut, Menu, X,
  Loader2, TrendingUp, Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminUsers from './AdminUsers';
import AdminTransactions from './AdminTransactions';
import AdminWithdrawals from './AdminWithdrawals';
import AdminBonuses from './AdminBonuses';
import AdminSettings from './AdminSettings';

export default function AdminDashboard() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ users: 0, deposits: 0, withdrawals: 0, totalBalance: 0 });

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/auth');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (role === 'admin') fetchStats();
  }, [role]);

  const fetchStats = async () => {
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { data: txData } = await supabase.from('transactions').select('type, amount, status').eq('status', 'completed');
    const { data: walletData } = await supabase.from('wallets').select('balance');
    
    const deposits = txData?.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0) || 0;
    const withdrawals = txData?.filter(t => t.type === 'withdrawal').reduce((s, t) => s + Math.abs(t.amount), 0) || 0;
    const totalBalance = walletData?.reduce((s, w) => s + Number(w.balance), 0) || 0;
    
    setStats({ users: usersCount || 0, deposits, withdrawals, totalBalance });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/transactions', icon: CreditCard, label: 'Transactions' },
    { path: '/admin/withdrawals', icon: ArrowDownRight, label: 'Withdrawals' },
    { path: '/admin/bonuses', icon: Gift, label: 'Bonuses' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <span className="text-xl font-bold gradient-text">Admin Panel</span>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path) ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <header className="h-16 border-b border-border flex items-center px-4 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Admin Dashboard</h1>
        </header>

        <div className="p-6">
          <Routes>
            <Route index element={
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="glass-card">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="w-5 h-5 text-primary" />
                        <span className="text-sm text-muted-foreground">Total Users</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.users}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-muted-foreground">Total Deposits</span>
                      </div>
                      <p className="text-2xl font-bold">KES {stats.deposits.toFixed(0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <ArrowDownRight className="w-5 h-5 text-orange-500" />
                        <span className="text-sm text-muted-foreground">Total Withdrawals</span>
                      </div>
                      <p className="text-2xl font-bold">KES {stats.withdrawals.toFixed(0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Wallet className="w-5 h-5 text-accent" />
                        <span className="text-sm text-muted-foreground">Total Balance</span>
                      </div>
                      <p className="text-2xl font-bold">KES {stats.totalBalance.toFixed(0)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            } />
            <Route path="users" element={<AdminUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="bonuses" element={<AdminBonuses />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

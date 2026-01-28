import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { 
  Wallet, 
  LogOut, 
  User, 
  Settings, 
  LayoutDashboard,
  Menu,
  X,
  Gamepad2,
  Gift,
  ArrowDownRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const { wallet } = useWallet();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnclaimedBonus, setHasUnclaimedBonus] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Check for unclaimed bonuses
  useEffect(() => {
    const checkBonuses = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_bonuses')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .limit(1);
      setHasUnclaimedBonus((data?.length || 0) > 0);
    };
    checkBonuses();
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">
                {settings?.site_name?.charAt(0) || 'B'}
              </span>
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">
              {settings?.site_name || 'BetKing'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user && (
              <>
                <Link to={role === 'admin' ? '/admin' : '/dashboard'} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link to="/games" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Games
                </Link>
                <Link to="/withdraw" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4" />
                  Withdraw
                </Link>
                <Link to="/deposit" className="text-muted-foreground hover:text-foreground transition-colors">
                  Deposit
                </Link>
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Welcome Bonus Indicator */}
                {hasUnclaimedBonus && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="relative animate-pulse bg-accent/10 border border-accent/50 text-accent hover:bg-accent/20"
                    onClick={() => navigate('/dashboard')}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Claim Bonus
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-ping" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full" />
                  </Button>
                )}

                {/* Balance */}
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="font-semibold">
                    KES {wallet?.balance?.toFixed(2) || '0.00'}
                  </span>
                </div>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{role}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(role === 'admin' ? '/admin' : '/dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/games')}>
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      Play Games
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/withdraw')}>
                      <ArrowDownRight className="mr-2 h-4 w-4" />
                      Withdraw
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/auth?mode=signup')} className="glow-primary">
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-2">
              {user && (
                <>
                  {hasUnclaimedBonus && (
                    <Link 
                      to="/dashboard" 
                      className="px-4 py-3 bg-accent/10 border border-accent/30 rounded-lg flex items-center gap-2 text-accent font-semibold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Gift className="w-5 h-5" />
                      🎁 Claim Your Welcome Bonus!
                    </Link>
                  )}
                  <Link 
                    to={role === 'admin' ? '/admin' : '/dashboard'} 
                    className="px-4 py-2 hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link 
                    to="/games" 
                    className="px-4 py-2 hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    Games
                  </Link>
                  <Link 
                    to="/deposit" 
                    className="px-4 py-2 hover:bg-secondary rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Deposit
                  </Link>
                  <Link 
                    to="/withdraw" 
                    className="px-4 py-2 hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    Withdraw
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

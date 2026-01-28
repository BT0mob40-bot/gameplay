import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Loader2, ArrowLeft, Rocket, Sparkles, Zap, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const MIN_BET = 10;
const BETTING_PHASE_DURATION = 5;

type GamePhase = 'betting' | 'playing' | 'crashed';
type UserStatus = 'waiting' | 'playing' | 'cashed_out' | 'lost';

export default function CrashGame() {
  const { user, loading: authLoading } = useAuth();
  const { wallet, deductBet, addWinnings } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [betAmount, setBetAmount] = useState(MIN_BET);
  const [autoCashout, setAutoCashout] = useState(2);
  const [gamePhase, setGamePhase] = useState<GamePhase>('betting');
  const [userStatus, setUserStatus] = useState<UserStatus>('waiting');
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState(1);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [activeBetAmount, setActiveBetAmount] = useState(0);
  const [bettingCountdown, setBettingCountdown] = useState(BETTING_PHASE_DURATION);
  const [playersInRound, setPlayersInRound] = useState(0);
  const [cashedOutMultiplier, setCashedOutMultiplier] = useState(0);

  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const bettingTimerRef = useRef<NodeJS.Timeout>();
  const roundTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const generateCrashPoint = useCallback(() => {
    const houseEdge = 0.04;
    const random = Math.random();
    
    if (random < houseEdge) {
      return 1.00;
    }
    
    const crash = 0.99 / (1 - random);
    return Math.max(1, Math.min(100, crash));
  }, []);

  const simulatePlayers = useCallback(() => {
    return Math.floor(Math.random() * 15) + 3;
  }, []);

  const startNewRound = useCallback(() => {
    setGamePhase('betting');
    setBettingCountdown(BETTING_PHASE_DURATION);
    setMultiplier(1);
    setUserStatus('waiting');
    setActiveBetAmount(0);
    setGameSessionId(null);
    setCashedOutMultiplier(0);
    setPlayersInRound(simulatePlayers());

    let countdown = BETTING_PHASE_DURATION;
    bettingTimerRef.current = setInterval(() => {
      countdown--;
      setBettingCountdown(countdown);
      
      if (countdown <= 0) {
        if (bettingTimerRef.current) clearInterval(bettingTimerRef.current);
        startRound();
      }
    }, 1000);
  }, [simulatePlayers]);

  const startRound = useCallback(async () => {
    const crash = generateCrashPoint();
    setCrashPoint(crash);
    setGamePhase('playing');
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const speed = 0.3 + (elapsed / 30000);
      const newMultiplier = 1 + (elapsed / 1000) * speed;
      
      if (newMultiplier >= crash) {
        setMultiplier(crash);
        handleCrash(crash);
        return;
      }

      setMultiplier(newMultiplier);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [generateCrashPoint]);

  useEffect(() => {
    startNewRound();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (bettingTimerRef.current) clearInterval(bettingTimerRef.current);
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    };
  }, []);

  const placeBet = async () => {
    if (gamePhase !== 'betting' || userStatus !== 'waiting') return;
    
    if (!wallet || wallet.balance < betAmount) {
      toast({
        title: 'Insufficient balance',
        description: 'Please deposit more funds to play.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Deduct bet using server-side function
      const success = await deductBet(betAmount);
      if (!success) {
        toast({
          title: 'Insufficient balance',
          description: 'Please deposit more funds to play.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setActiveBetAmount(betAmount);
      setUserStatus('playing');

      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user!.id,
          game_type: 'crash',
          bet_amount: betAmount,
          multiplier: 1,
          status: 'active',
          game_data: { auto_cashout: autoCashout },
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      await supabase.from('transactions').insert({
        user_id: user!.id,
        type: 'bet',
        amount: -betAmount,
        status: 'completed',
        description: 'Crash game bet',
      });

      setGameSessionId(session.id);
      setPlayersInRound(prev => prev + 1);

      toast({
        title: '🎰 Bet Placed!',
        description: `KES ${betAmount} bet placed. Good luck!`,
      });
    } catch (error) {
      console.error('Error placing bet:', error);
      setUserStatus('waiting');
      toast({
        title: 'Error',
        description: 'Failed to place bet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for auto-cashout
  useEffect(() => {
    if (gamePhase === 'playing' && userStatus === 'playing' && autoCashout > 1 && multiplier >= autoCashout) {
      cashout();
    }
  }, [multiplier, gamePhase, userStatus, autoCashout]);

  const handleCrash = async (crashAt: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // If player had an active bet and didn't cash out, they lose
    if (userStatus === 'playing') {
      setUserStatus('lost');
      
      if (gameSessionId) {
        await supabase
          .from('game_sessions')
          .update({
            status: 'lost',
            multiplier: crashAt,
            payout: 0,
            ended_at: new Date().toISOString(),
          })
          .eq('id', gameSessionId);
      }

      toast({
        title: '💥 Crashed!',
        description: `Crashed at ${crashAt.toFixed(2)}x. You lost KES ${activeBetAmount}`,
        variant: 'destructive',
      });
    }

    setGamePhase('crashed');
    setHistory((prev) => [crashAt, ...prev.slice(0, 9)]);

    // Start new round after delay
    roundTimerRef.current = setTimeout(() => {
      startNewRound();
    }, 3000);
  };

  const cashout = async () => {
    if (gamePhase !== 'playing' || userStatus !== 'playing' || !gameSessionId) return;

    const currentMult = multiplier;
    const payout = activeBetAmount * currentMult;
    setUserStatus('cashed_out');
    setCashedOutMultiplier(currentMult);

    try {
      // Add winnings using server-side function
      await addWinnings(payout);

      await supabase
        .from('game_sessions')
        .update({
          status: 'cashed_out',
          multiplier: currentMult,
          payout,
          ended_at: new Date().toISOString(),
        })
        .eq('id', gameSessionId);

      await supabase.from('transactions').insert({
        user_id: user!.id,
        type: 'win',
        amount: payout,
        status: 'completed',
        description: `Crash win - ${currentMult.toFixed(2)}x`,
      });

      toast({
        title: '💰 Cashed Out!',
        description: `You won KES ${payout.toFixed(2)} at ${currentMult.toFixed(2)}x`,
      });
    } catch (error) {
      console.error('Error cashing out:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (bettingTimerRef.current) clearInterval(bettingTimerRef.current);
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getMultiplierColor = () => {
    if (gamePhase === 'crashed') return 'from-red-500 to-red-600';
    if (userStatus === 'cashed_out') return 'from-primary to-accent';
    if (multiplier >= 5) return 'from-purple-500 to-pink-500';
    if (multiplier >= 2) return 'from-primary to-accent';
    if (multiplier >= 1.5) return 'from-yellow-500 to-orange-500';
    return 'from-muted-foreground to-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <Button variant="ghost" className="mb-6" onClick={() => navigate('/games')}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Games
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Controls */}
            <Card className="glass-card lg:order-2 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span>Crash</span>
                  <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {playersInRound}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Always show bet amount and auto-cashout settings for next round */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Bet Amount (KES)</Label>
                  <Input
                    type="number"
                    min={MIN_BET}
                    max={wallet?.balance || MIN_BET}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(MIN_BET, Number(e.target.value)))}
                    className="text-lg h-12"
                    disabled={userStatus === 'playing'}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => setBetAmount(Math.max(MIN_BET, betAmount / 2))}
                      disabled={userStatus === 'playing'}
                    >
                      ½
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => setBetAmount(Math.min(wallet?.balance || MIN_BET, betAmount * 2))}
                      disabled={userStatus === 'playing'}
                    >
                      2×
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => setBetAmount(wallet?.balance || MIN_BET)}
                      disabled={userStatus === 'playing'}
                    >
                      Max
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Auto Cashout (x)</Label>
                  <Input
                    type="number"
                    min={1.1}
                    max={100}
                    step={0.1}
                    value={autoCashout}
                    onChange={(e) => setAutoCashout(Math.max(1.1, Number(e.target.value)))}
                    className="text-lg h-12"
                    disabled={userStatus === 'playing'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically cash out at this multiplier
                  </p>
                </div>

                {/* Betting Phase UI */}
                {gamePhase === 'betting' && (
                  <>
                    <div className="text-center p-4 bg-accent/10 border border-accent/30 rounded-xl">
                      <div className="flex items-center justify-center gap-2 text-accent mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="font-bold text-lg">Betting Phase</span>
                      </div>
                      <p className="text-3xl font-bold text-accent">{bettingCountdown}s</p>
                      <p className="text-sm text-muted-foreground mt-1">Place your bet now!</p>
                    </div>

                    {userStatus === 'waiting' ? (
                      <Button 
                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" 
                        size="lg"
                        onClick={placeBet}
                        disabled={loading || !wallet || wallet.balance < betAmount}
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Rocket className="mr-2 w-5 h-5" />
                            Place Bet (KES {betAmount})
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="text-center p-6 bg-primary/10 border border-primary/30 rounded-xl">
                        <p className="text-primary font-semibold text-lg">✅ Bet Placed!</p>
                        <p className="text-2xl font-bold mt-2">KES {activeBetAmount}</p>
                        <p className="text-sm text-muted-foreground mt-2">Waiting for round to start...</p>
                      </div>
                    )}
                  </>
                )}

                {/* Playing Phase UI */}
                {gamePhase === 'playing' && userStatus === 'playing' && (
                  <Button 
                    className="w-full h-28 text-2xl font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 flex flex-col items-center justify-center animate-pulse"
                    onClick={cashout}
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-6 h-6" />
                      Cash Out NOW!
                    </span>
                    <span className="text-lg font-medium mt-1">
                      KES {(activeBetAmount * multiplier).toFixed(2)}
                    </span>
                  </Button>
                )}

                {gamePhase === 'playing' && userStatus === 'cashed_out' && (
                  <div className="text-center p-6 bg-primary/10 border border-primary/30 rounded-xl">
                    <p className="text-lg font-semibold text-primary mb-2">🎉 Cashed Out!</p>
                    <p className="text-3xl font-bold">KES {(activeBetAmount * cashedOutMultiplier).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground mt-2">at {cashedOutMultiplier.toFixed(2)}x</p>
                    <p className="text-xs text-muted-foreground mt-4">Watching round continue...</p>
                  </div>
                )}

                {gamePhase === 'playing' && userStatus === 'waiting' && (
                  <div className="text-center p-4 bg-secondary/50 rounded-xl">
                    <p className="text-muted-foreground">You didn't bet this round</p>
                    <p className="text-sm mt-2">Prepare your bet for the next round above</p>
                  </div>
                )}

                {gamePhase === 'crashed' && (
                  <div className="text-center p-6 bg-secondary/50 rounded-xl">
                    <p className="text-lg font-semibold mb-2">
                      {userStatus === 'cashed_out' ? '🎉 You Cashed Out!' : userStatus === 'lost' ? '💥 You Lost!' : 'Round Over'}
                    </p>
                    {userStatus === 'cashed_out' && (
                      <p className="text-xl font-bold text-primary">Won KES {(activeBetAmount * cashedOutMultiplier).toFixed(2)}</p>
                    )}
                    {userStatus === 'lost' && (
                      <p className="text-xl font-bold text-destructive">Lost KES {activeBetAmount}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">Next round starting soon...</p>
                  </div>
                )}

                {/* History */}
                {history.length > 0 && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground mb-3">Recent Crashes</p>
                    <div className="flex flex-wrap gap-2">
                      {history.map((h, i) => (
                        <span 
                          key={i}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                            h >= 2 
                              ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/30' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {h.toFixed(2)}x
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Game Display */}
            <Card className="glass-card lg:col-span-2 lg:order-1 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-secondary/50 via-secondary/30 to-background flex items-center justify-center relative overflow-hidden">
                  {/* Animated background grid */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:40px_40px] text-primary" />
                  </div>

                  {/* Betting phase overlay */}
                  {gamePhase === 'betting' && (
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                      <div className="bg-accent/90 text-accent-foreground px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Betting: {bettingCountdown}s
                      </div>
                      <div className="bg-secondary/90 px-4 py-2 rounded-lg flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {playersInRound} players
                      </div>
                    </div>
                  )}

                  {/* Rising gradient effect during play */}
                  {gamePhase === 'playing' && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/30 via-primary/10 to-transparent transition-all duration-100"
                      style={{ height: `${Math.min(100, (multiplier - 1) * 25)}%` }}
                    />
                  )}

                  {/* Rocket animation */}
                  {gamePhase === 'playing' && (
                    <div 
                      className="absolute transition-all duration-100"
                      style={{ 
                        bottom: `${Math.min(70, (multiplier - 1) * 15)}%`,
                        left: '50%',
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <Rocket className="w-16 h-16 text-primary animate-bounce" style={{ transform: 'rotate(-45deg)' }} />
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4 h-8 bg-gradient-to-b from-orange-500 to-transparent rounded-full blur-sm animate-pulse" />
                    </div>
                  )}

                  {/* Crash explosion */}
                  {gamePhase === 'crashed' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full bg-red-500/20 animate-ping" />
                    </div>
                  )}

                  {/* Multiplier Display */}
                  <div className="text-center z-10 relative">
                    <p className={`text-7xl md:text-9xl font-black bg-gradient-to-r ${getMultiplierColor()} bg-clip-text text-transparent transition-all`}>
                      {multiplier.toFixed(2)}x
                    </p>
                    
                    {gamePhase === 'betting' && (
                      <div className="mt-4">
                        <span className="text-2xl text-accent font-bold">
                          ⏱️ Place your bets!
                        </span>
                      </div>
                    )}
                    
                    {gamePhase === 'crashed' && (
                      <div className="mt-4">
                        <span className="text-3xl text-red-500 font-bold animate-pulse">
                          💥 CRASHED!
                        </span>
                      </div>
                    )}
                    
                    {gamePhase === 'playing' && userStatus === 'cashed_out' && (
                      <div className="mt-4 space-y-2">
                        <span className="text-2xl text-primary font-bold">
                          🎉 CASHED OUT at {cashedOutMultiplier.toFixed(2)}x
                        </span>
                        <p className="text-xl font-semibold">
                          Won KES {(activeBetAmount * cashedOutMultiplier).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

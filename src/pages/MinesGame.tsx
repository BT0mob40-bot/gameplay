import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Bomb, Gem, Loader2, ArrowLeft, RotateCcw, Sparkles, Diamond } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const GRID_SIZE = 25;
const MIN_BET = 10;

interface MineCell {
  id: number;
  isMine: boolean;
  isRevealed: boolean;
  isExploded?: boolean;
}

export default function MinesGame() {
  const { user, loading: authLoading } = useAuth();
  const { wallet, deductBet, addWinnings } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [betAmount, setBetAmount] = useState(MIN_BET);
  const [minesCount, setMinesCount] = useState(5);
  const [grid, setGrid] = useState<MineCell[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [revealedCount, setRevealedCount] = useState(0);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeBetAmount, setActiveBetAmount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const calculateMultiplier = useCallback((revealed: number, mines: number) => {
    const safeSpots = GRID_SIZE - mines;
    let multiplier = 1;
    for (let i = 0; i < revealed; i++) {
      multiplier *= safeSpots / (safeSpots - i);
    }
    // House edge of 3%
    return Math.min(multiplier * 0.97, 25);
  }, []);

  const initializeGrid = useCallback((mines: number) => {
    const cells: MineCell[] = Array.from({ length: GRID_SIZE }, (_, i) => ({
      id: i,
      isMine: false,
      isRevealed: false,
    }));

    const minePositions = new Set<number>();
    while (minePositions.size < mines) {
      minePositions.add(Math.floor(Math.random() * GRID_SIZE));
    }

    minePositions.forEach((pos) => {
      cells[pos].isMine = true;
    });

    return cells;
  }, []);

  const startGame = async () => {
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

      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user!.id,
          game_type: 'mines',
          bet_amount: betAmount,
          multiplier: 1,
          status: 'active',
          game_data: { mines_count: minesCount },
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      await supabase.from('transactions').insert({
        user_id: user!.id,
        type: 'bet',
        amount: -betAmount,
        status: 'completed',
        description: `Mines game bet - ${minesCount} mines`,
      });

      setGameSessionId(session.id);
      setGrid(initializeGrid(minesCount));
      setGameActive(true);
      setCurrentMultiplier(1);
      setRevealedCount(0);
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: 'Error',
        description: 'Failed to start game. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const revealCell = async (cellId: number) => {
    if (!gameActive || grid[cellId].isRevealed) return;

    const cell = grid[cellId];
    const newGrid = [...grid];
    newGrid[cellId] = { ...cell, isRevealed: true };

    if (cell.isMine) {
      // Hit a mine - LOSE
      newGrid.forEach((c, i) => {
        if (c.isMine) {
          newGrid[i] = { ...c, isRevealed: true, isExploded: i === cellId };
        }
      });
      setGrid(newGrid);
      await endGame('lost', 0);
    } else {
      const newRevealedCount = revealedCount + 1;
      const newMultiplier = calculateMultiplier(newRevealedCount, minesCount);
      
      setGrid(newGrid);
      setRevealedCount(newRevealedCount);
      setCurrentMultiplier(newMultiplier);

      // Auto-win if all safe spots revealed
      if (newRevealedCount === GRID_SIZE - minesCount) {
        await cashOut(newMultiplier);
      }
    }
  };

  const cashOut = async (mult?: number) => {
    if (!gameActive) return;
    const finalMultiplier = mult ?? currentMultiplier;
    const payout = activeBetAmount * finalMultiplier;
    await endGame('cashed_out', payout);
  };

  const endGame = async (status: 'won' | 'lost' | 'cashed_out', payout: number) => {
    setGameActive(false);
    setLoading(true);

    try {
      await supabase
        .from('game_sessions')
        .update({
          status,
          multiplier: currentMultiplier,
          payout,
          ended_at: new Date().toISOString(),
        })
        .eq('id', gameSessionId);

      if (payout > 0) {
        // Add winnings using server-side function
        await addWinnings(payout);

        await supabase.from('transactions').insert({
          user_id: user!.id,
          type: 'win',
          amount: payout,
          status: 'completed',
          description: `Mines win - ${currentMultiplier.toFixed(2)}x`,
        });

        toast({
          title: '🎉 You Won!',
          description: `You won KES ${payout.toFixed(2)} at ${currentMultiplier.toFixed(2)}x`,
        });
      } else {
        toast({
          title: '💥 Boom!',
          description: 'You hit a mine. Better luck next time!',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error ending game:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setGrid([]);
    setGameActive(false);
    setCurrentMultiplier(1);
    setRevealedCount(0);
    setGameSessionId(null);
    setActiveBetAmount(0);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <Bomb className="w-5 h-5 text-white" />
                  </div>
                  <span>Mines</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {!gameActive ? (
                  <>
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Bet Amount (KES)</Label>
                      <Input
                        type="number"
                        min={MIN_BET}
                        max={wallet?.balance || MIN_BET}
                        value={betAmount}
                        onChange={(e) => setBetAmount(Math.max(MIN_BET, Number(e.target.value)))}
                        className="text-lg h-12"
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => setBetAmount(Math.max(MIN_BET, betAmount / 2))}
                        >
                          ½
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => setBetAmount(Math.min(wallet?.balance || MIN_BET, betAmount * 2))}
                        >
                          2×
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => setBetAmount(wallet?.balance || MIN_BET)}
                        >
                          Max
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-medium">Mines</Label>
                        <span className="text-2xl font-bold text-orange-500">{minesCount}</span>
                      </div>
                      <Slider
                        value={[minesCount]}
                        onValueChange={([value]) => setMinesCount(value)}
                        min={1}
                        max={24}
                        step={1}
                        className="py-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1 mine (Low risk)</span>
                        <span>24 mines (High risk)</span>
                      </div>
                    </div>

                    <div className="bg-secondary/50 rounded-xl p-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Potential 1st Tile</span>
                        <span className="text-primary font-medium">
                          {calculateMultiplier(1, minesCount).toFixed(2)}x
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Safe Tiles</span>
                        <span>{GRID_SIZE - minesCount}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600" 
                      size="lg"
                      onClick={startGame}
                      disabled={loading || !wallet || wallet.balance < betAmount}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="mr-2 w-5 h-5" />
                          Start Game
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center py-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl">
                      <p className="text-sm text-muted-foreground mb-1">Current Multiplier</p>
                      <p className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {currentMultiplier.toFixed(2)}x
                      </p>
                      <p className="text-xl mt-2 font-semibold">
                        KES {(activeBetAmount * currentMultiplier).toFixed(2)}
                      </p>
                    </div>

                    <Button 
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90" 
                      size="lg"
                      onClick={() => cashOut()}
                      disabled={loading || revealedCount === 0}
                    >
                      💰 Cash Out
                    </Button>
                    
                    <div className="text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Gem className="w-4 h-4 text-cyan-400" />
                        {revealedCount} / {GRID_SIZE - minesCount} gems found
                      </span>
                    </div>
                  </>
                )}

                {grid.length > 0 && !gameActive && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={resetGame}
                  >
                    <RotateCcw className="mr-2 w-4 h-4" />
                    New Game
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Game Grid */}
            <Card className="glass-card lg:col-span-2 lg:order-1 overflow-hidden">
              <CardContent className="p-6">
                <div className="grid grid-cols-5 gap-2 sm:gap-3 aspect-square max-w-lg mx-auto">
                  {grid.length === 0 ? (
                    Array.from({ length: GRID_SIZE }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center border border-border/50 shadow-inner"
                      >
                        <Diamond className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/30" />
                      </div>
                    ))
                  ) : (
                    grid.map((cell) => (
                      <button
                        key={cell.id}
                        className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-300 transform ${
                          cell.isRevealed
                            ? cell.isMine
                              ? cell.isExploded
                                ? 'bg-gradient-to-br from-red-600 to-red-800 animate-pulse scale-110 shadow-lg shadow-red-500/50'
                                : 'bg-gradient-to-br from-red-500/70 to-red-700/70'
                              : 'bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-2 border-cyan-400 shadow-lg shadow-cyan-500/30'
                            : 'bg-gradient-to-br from-secondary via-secondary/80 to-secondary/60 hover:from-secondary/90 hover:via-secondary/70 hover:to-secondary/50 hover:scale-105 cursor-pointer border border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20'
                        }`}
                        onClick={() => revealCell(cell.id)}
                        disabled={!gameActive || cell.isRevealed}
                      >
                        {cell.isRevealed ? (
                          cell.isMine ? (
                            <Bomb className={`w-6 h-6 sm:w-8 sm:h-8 ${cell.isExploded ? 'text-white' : 'text-red-400'}`} />
                          ) : (
                            <Gem className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 drop-shadow-lg" />
                          )
                        ) : (
                          <Diamond className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/40" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

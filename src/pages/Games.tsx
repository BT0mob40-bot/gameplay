import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bomb, TrendingUp, Loader2, Play, Sparkles } from 'lucide-react';

const games = [
  {
    id: 'mines',
    name: 'Mines',
    description: 'Navigate through a minefield! Reveal gems and avoid bombs to multiply your bet.',
    icon: Bomb,
    color: 'from-red-500 to-orange-500',
    maxMultiplier: '25x',
  },
  {
    id: 'crash',
    name: 'Crash',
    description: 'Watch the multiplier rise and cash out before it crashes! How high can you go?',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
    maxMultiplier: '100x',
  },
];

export default function Games() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
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
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8 text-accent" />
              Games
            </h1>
            <p className="text-muted-foreground">Choose a game and start winning!</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {games.map((game) => (
              <Card 
                key={game.id}
                className="glass-card overflow-hidden group hover:border-primary/50 transition-all duration-300"
              >
                <CardContent className="p-8">
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                    <game.icon className="w-12 h-12 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold mb-2 text-center">{game.name}</h3>
                  <p className="text-muted-foreground mb-6 text-center">{game.description}</p>

                  <div className="flex items-center justify-between mb-6 px-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Max Win</p>
                      <p className="text-2xl font-bold text-primary">{game.maxMultiplier}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Min Bet</p>
                      <p className="text-lg font-semibold">KES 10</p>
                    </div>
                  </div>

                  <Button 
                    className="w-full text-lg py-6"
                    onClick={() => navigate(`/games/${game.id}`)}
                  >
                    <Play className="mr-2 w-5 h-5" />
                    Play Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

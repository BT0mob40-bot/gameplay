import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Bomb, TrendingUp, Play, Sparkles, Diamond, Gem, Rocket, Lock } from 'lucide-react';

const games = [
  {
    id: 'mines',
    name: 'Mines',
    description: 'Navigate through a minefield! Reveal gems and avoid bombs to multiply your bet.',
    icon: Bomb,
    bgIcon: Diamond,
    gradient: 'from-red-600 via-red-500 to-orange-500',
    bgGradient: 'from-red-950/50 to-orange-950/30',
    maxMultiplier: '25x',
    players: '1.2k online',
  },
  {
    id: 'crash',
    name: 'Crash',
    description: 'Watch the multiplier rise and cash out before it crashes! How high can you go?',
    icon: TrendingUp,
    bgIcon: Rocket,
    gradient: 'from-green-600 via-emerald-500 to-teal-500',
    bgGradient: 'from-green-950/50 to-emerald-950/30',
    maxMultiplier: '100x',
    players: '2.5k online',
  },
];

export function GamesShowcase() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePlayClick = (gameId: string) => {
    if (user) {
      navigate(`/games/${gameId}`);
    } else {
      navigate('/auth?mode=signup');
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-primary/10 border border-primary/20 rounded-full">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Popular Games</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">Choose Your Game</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the thrill of our exciting games. Fair odds, instant payouts, and endless fun!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {games.map((game) => (
            <Card 
              key={game.id}
              className={`relative overflow-hidden group border-0 bg-gradient-to-br ${game.bgGradient} hover:scale-[1.02] transition-all duration-500 cursor-pointer`}
              onClick={() => handlePlayClick(game.id)}
            >
              {/* Animated background icon */}
              <div className="absolute -right-8 -top-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <game.bgIcon className="w-48 h-48 text-foreground" />
              </div>
              
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${game.gradient} blur-3xl`} style={{ transform: 'scale(0.8)' }} />
              
              <CardContent className="p-8 relative z-10">
                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <game.icon className="w-10 h-10 text-white" />
                </div>

                {/* Game info */}
                <h3 className="text-3xl font-bold mb-3">{game.name}</h3>
                <p className="text-muted-foreground mb-6 text-lg">{game.description}</p>

                {/* Stats */}
                <div className="flex items-center justify-between mb-8 p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Max Win</p>
                    <p className={`text-3xl font-black bg-gradient-to-r ${game.gradient} bg-clip-text text-transparent`}>
                      {game.maxMultiplier}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Min Bet</p>
                    <p className="text-xl font-bold">KES 10</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Playing</p>
                    <p className="text-sm font-medium text-primary">{game.players}</p>
                  </div>
                </div>

                {/* Play button */}
                <Button 
                  className={`w-full h-14 text-lg font-semibold bg-gradient-to-r ${game.gradient} hover:opacity-90 transition-opacity`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayClick(game.id);
                  }}
                >
                  <Play className="mr-2 w-5 h-5" />
                  Play Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Casino-style decorative cards */}
        <div className="mt-20">
          <h3 className="text-center text-2xl font-bold mb-8">
            <span className="text-muted-foreground">Coming Soon</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { name: 'Dice', icon: '🎲', color: 'from-purple-500 to-pink-500' },
              { name: 'Plinko', icon: '⚪', color: 'from-blue-500 to-cyan-500' },
              { name: 'Wheel', icon: '🎡', color: 'from-yellow-500 to-orange-500' },
              { name: 'Slots', icon: '🎰', color: 'from-pink-500 to-red-500' },
            ].map((game, i) => (
              <div 
                key={i}
                className="relative group"
              >
                <div className={`aspect-[3/4] rounded-2xl bg-gradient-to-br ${game.color} opacity-20 group-hover:opacity-30 transition-opacity`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl mb-2 grayscale group-hover:grayscale-0 transition-all">{game.icon}</span>
                  <span className="text-lg font-semibold text-muted-foreground">{game.name}</span>
                  <Lock className="w-4 h-4 text-muted-foreground/50 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

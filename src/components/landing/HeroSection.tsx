import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useAuth } from '@/hooks/useAuth';
import { Gift, ArrowRight, Sparkles, Play, TrendingUp, Shield, Zap } from 'lucide-react';

export function HeroSection() {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const { user } = useAuth();

  return (
    <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px]" />

      {/* Floating elements */}
      <div className="absolute top-1/4 left-[10%] w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 opacity-20 animate-bounce" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-1/3 right-[15%] w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/50 opacity-20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
      <div className="absolute top-1/3 right-[20%] w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent opacity-20 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Welcome Bonus Badge */}
          {settings?.welcome_bonus_enabled && (
            <div className="inline-flex items-center gap-3 px-6 py-3 mb-8 bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 rounded-full shadow-lg shadow-accent/10">
              <div className="flex items-center gap-2 text-accent">
                <Gift className="w-6 h-6" />
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-accent font-bold text-lg">
                GET KES {settings.welcome_bonus_amount} WELCOME BONUS!
              </span>
              <ArrowRight className="w-5 h-5 text-accent animate-pulse" />
            </div>
          )}

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1]">
            <span className="gradient-text">Win Big</span>
            <br />
            <span className="text-foreground">Play Smart</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Kenya's most trusted gaming platform. Play <span className="text-primary font-semibold">Mines</span>, <span className="text-primary font-semibold">Crash</span>, and more. 
            Instant M-Pesa deposits & withdrawals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {user ? (
              <Button 
                size="lg" 
                onClick={() => navigate('/games')}
                className="text-xl px-10 py-7 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30 font-bold"
              >
                <Play className="mr-2 w-6 h-6" />
                Play Now
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth?mode=signup')}
                  className="text-xl px-10 py-7 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 font-bold"
                >
                  Start Winning Now
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="text-xl px-10 py-7 border-2 font-semibold"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">Instant Payouts</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">100% Secure</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">Fair Games</span>
            </div>
          </div>

          {/* Casino Cards Preview */}
          <div className="mt-16 flex justify-center items-end gap-4 perspective-1000">
            {[
              { icon: '🎰', rotation: '-15deg', delay: '0s' },
              { icon: '💎', rotation: '-5deg', delay: '0.1s' },
              { icon: '🚀', rotation: '0deg', delay: '0.2s', main: true },
              { icon: '💰', rotation: '5deg', delay: '0.3s' },
              { icon: '🎲', rotation: '15deg', delay: '0.4s' },
            ].map((card, i) => (
              <div
                key={i}
                className={`relative ${card.main ? 'w-24 h-36 md:w-32 md:h-48' : 'w-16 h-24 md:w-24 md:h-36'} rounded-xl bg-gradient-to-br from-secondary to-secondary/80 border border-border/50 flex items-center justify-center shadow-xl hover:scale-110 transition-transform cursor-pointer`}
                style={{ 
                  transform: `rotate(${card.rotation})`,
                  animationDelay: card.delay
                }}
              >
                <span className={`${card.main ? 'text-4xl md:text-6xl' : 'text-2xl md:text-4xl'}`}>{card.icon}</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-primary/10 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

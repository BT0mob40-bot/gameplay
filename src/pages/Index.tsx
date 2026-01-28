import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { GamesShowcase } from '@/components/landing/GamesShowcase';
import { FeaturesSection } from '@/components/landing/FeaturesSection';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <GamesShowcase />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

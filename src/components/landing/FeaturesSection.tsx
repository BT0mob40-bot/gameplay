import { Shield, Zap, Smartphone, Headphones } from 'lucide-react';

const features = [
  {
    icon: Smartphone,
    title: 'M-Pesa Integration',
    description: 'Deposit and withdraw instantly using M-Pesa. No delays, no hassle.',
  },
  {
    icon: Zap,
    title: 'Instant Payouts',
    description: 'Win and get paid immediately. Your winnings are available right away.',
  },
  {
    icon: Shield,
    title: 'Secure & Fair',
    description: 'Provably fair games with transparent odds. Your funds are always safe.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Our support team is always ready to help you with any questions.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why Choose <span className="gradient-text">Us?</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We provide the best gaming experience with top-notch security and support.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-colors"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-primary/10 flex items-center justify-center">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

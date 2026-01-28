import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Mail, Phone, Shield, Gamepad2 } from 'lucide-react';

export function Footer() {
  const { settings } = useSiteSettings();

  return (
    <footer className="bg-card border-t border-border/50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">
                  {settings?.site_name?.charAt(0) || 'B'}
                </span>
              </div>
              <span className="text-xl font-bold gradient-text">
                {settings?.site_name || 'BetKing'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              The most trusted gaming platform in Kenya. Play responsibly.
            </p>
          </div>

          {/* Games */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-primary" />
              Games
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Mines</li>
              <li>Crash</li>
              <li>More Coming Soon</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {settings?.contact_email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {settings.contact_email}
                </li>
              )}
              {settings?.contact_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {settings.contact_phone}
                </li>
              )}
            </ul>
          </div>

          {/* Security */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Security
            </h4>
            <p className="text-sm text-muted-foreground">
              Your funds and data are protected with industry-standard encryption.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings?.site_name || 'BetKing'}. All rights reserved.</p>
          <p className="mt-2">18+ Only. Please gamble responsibly.</p>
        </div>
      </div>
    </footer>
  );
}

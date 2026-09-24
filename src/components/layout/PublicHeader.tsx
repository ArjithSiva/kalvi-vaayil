import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { GraduationCap, Compass, Moon, Sun, LogIn, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

/**
 * Shared header for every pre-authentication page.
 *
 * Replaces the four hand-rolled copies that used to live in Home, PublicDiscover,
 * LoginPage and RegisterPage — they had already drifted apart (one was `fixed`,
 * the others `sticky`, each with its own container).
 *
 * The action row deliberately does NOT use flex-wrap: wrapping pushed the
 * actions onto a second line and shifted the whole page down whenever the Tamil
 * labels grew. `shrink-0` on the controls plus `min-w-0` on the brand keeps
 * everything on one row at every width instead.
 */
export function PublicHeader() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const navLinks = [
    { to: '/explore', label: t('discover.exploreWorkshops'), icon: Compass },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 kv-glass">
      <div className="kv-container flex h-16 items-center justify-between gap-2 sm:gap-3">
        {/* Brand */}
        <Link to="/" className="flex min-w-0 items-center gap-2.5 shrink">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-hero shadow-glow">
            <GraduationCap className="h-5 w-5 text-hero-foreground" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight sm:text-base">
              {t('app.name')}
            </span>
            <span className="hidden truncate text-[10px] leading-tight text-muted-foreground sm:block">
              {t('app.tagline')}
            </span>
          </span>
        </Link>

        {/* Primary nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions — no wrap, so the header height never changes */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <Button asChild size="sm" className="shrink-0">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.dashboard')}</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden shrink-0 sm:inline-flex">
                <Link to="/login">
                  <LogIn className="h-4 w-4" />
                  {t('auth.login')}
                </Link>
              </Button>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/register">{t('auth.register')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

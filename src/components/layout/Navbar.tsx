import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/authContext';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GraduationCap, LayoutDashboard, BookOpen, Calendar, BarChart3,
  Award, Bell, Settings, LogOut, Moon, Sun, Users, FolderTree,
  Sliders, Compass, Menu, Inbox,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * Application shell header.
 *
 * Three zones — brand, nav, actions — on a single non-wrapping row. The previous
 * version put `flex-wrap` on that row, so long Tamil labels pushed the actions
 * onto a second line and shifted the whole page down. The desktop nav now only
 * appears from `lg` up: between `md` and `lg` the labels had no room, so the
 * links rendered as a row of unlabelled icons. Those widths get the drawer.
 */
export function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = (): NavItem[] => {
    if (!user) return [];
    const base: NavItem[] = [
      { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    ];

    if (user.role === 'admin') {
      return [
        ...base,
        { to: '/admin/organizers', label: t('nav.admin.organizers'), icon: Users },
        { to: '/admin/categories', label: t('nav.admin.categories'), icon: FolderTree },
        { to: '/admin/quota-inbox', label: t('nav.admin.quotaInbox'), icon: Inbox },
        { to: '/admin/analytics', label: t('nav.admin.analytics'), icon: BarChart3 },
        { to: '/admin/settings', label: t('nav.admin.settings'), icon: Sliders },
      ];
    }
    if (user.role === 'organizer') {
      return [...base, { to: '/organizer/workshops', label: t('nav.workshops'), icon: BookOpen }];
    }
    return [
      ...base,
      { to: '/discover', label: t('nav.discover'), icon: Compass },
      { to: '/schedule', label: t('nav.schedule'), icon: Calendar },
      { to: '/progress', label: t('nav.progress'), icon: BarChart3 },
      { to: '/certificates', label: t('nav.certificates'), icon: Award },
    ];
  };

  const navItems = getNavItems();
  const isActive = (to: string) => location.pathname === to;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 kv-glass">
      <div className="kv-container flex h-16 items-center justify-between gap-2">
        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 lg:hidden"
                aria-label={t('nav.menu')}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
              <SheetHeader className="border-b border-border/60 p-4 text-left">
                <SheetTitle className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-hero">
                    <GraduationCap className="h-4 w-4 text-hero-foreground" />
                  </span>
                  <span className="min-w-0 truncate">{t('app.name')}</span>
                </SheetTitle>
              </SheetHeader>

              <nav aria-label={t('nav.navigation')} className="flex flex-col gap-1 p-3">
                {user && (
                  <div className="mb-2 flex items-center gap-3 rounded-lg bg-secondary/60 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {user.name?.[0] || '?'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{user.name}</span>
                      <span className="block truncate text-xs capitalize text-muted-foreground">
                        {t(`auth.${user.role}`)}
                      </span>
                    </span>
                  </div>
                )}

                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(item.to)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-secondary',
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0">{item.label}</span>
                  </Link>
                ))}

                <div className="my-2 border-t border-border/60" />

                <Link
                  to="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  {t('nav.settings')}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {t('nav.logout')}
                </button>
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-hero shadow-glow">
              <GraduationCap className="h-5 w-5 text-hero-foreground" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-bold leading-tight">
                {t('app.name')}
              </span>
              <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                {t('app.tagline')}
              </span>
            </span>
          </Link>
        </div>

        {/* ── Desktop nav ───────────────────────────────────────────────── */}
        <nav aria-label={t('nav.navigation')} className="hidden min-w-0 items-center gap-0.5 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="hidden shrink-0 sm:inline-flex"
          >
            <Link to="/notifications" aria-label={t('nav.notifications')}>
              <Bell className="h-4.5 w-4.5" />
            </Link>
          </Button>

          <LanguageSwitcher />

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-offset-background transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={t('nav.account')}
                >
                  {user.name?.[0] || '?'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="min-w-0">
                  <span className="block truncate font-medium">{user.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex cursor-pointer items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t('nav.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

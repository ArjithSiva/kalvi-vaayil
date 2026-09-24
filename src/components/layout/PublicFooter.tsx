import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Compass, Award, ShieldCheck } from 'lucide-react';

export function PublicFooter() {
  const { t } = useTranslation();

  const links = [
    { to: '/explore', label: t('discover.exploreWorkshops'), icon: Compass },
    { to: '/login', label: t('auth.login'), icon: Award },
  ];

  return (
    <footer className="mt-auto border-t border-border/60 bg-card/40">
      <div className="kv-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-hero">
              <GraduationCap className="h-4 w-4 text-hero-foreground" />
            </span>
            <span className="font-bold">{t('app.name')}</span>
          </div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t('home.footer.tagline')}
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <link.icon className="h-3.5 w-3.5 shrink-0" />
              {link.label}
            </Link>
          ))}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            {t('home.footer.verified')}
          </span>
        </nav>
      </div>

      <div className="border-t border-border/60">
        <div className="kv-container py-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {t('app.name')} · {t('home.footer.rights')}
        </div>
      </div>
    </footer>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen, Users, GraduationCap, ClipboardList, Inbox, BarChart3, ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalOrganizers: number;
  totalWorkshops: number;
  totalRegistrations: number;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrganizers: 0,
    totalWorkshops: 0,
    totalRegistrations: 0,
  });

  useEffect(() => {
    api.get('/admin/dashboard').then((res) => setStats(res.data)).catch(() => undefined);
  }, []);

  const cards = [
    { title: t('admin.stats.participants'), value: stats.totalUsers, icon: Users },
    { title: t('admin.stats.organizers'), value: stats.totalOrganizers, icon: GraduationCap },
    { title: t('admin.stats.workshops'), value: stats.totalWorkshops, icon: BookOpen },
    { title: t('admin.stats.registrations'), value: stats.totalRegistrations, icon: ClipboardList },
  ];

  const shortcuts = [
    { to: '/admin/organizers', label: t('nav.admin.organizers'), icon: Users },
    { to: '/admin/quota-inbox', label: t('nav.admin.quotaInbox'), icon: Inbox },
    { to: '/admin/analytics', label: t('nav.admin.analytics'), icon: BarChart3 },
    { to: '/organizer/workshops', label: t('nav.workshops'), icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('admin.dashboard.subtitle')}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} variant="interactive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold sm:text-3xl">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{t('common.actions')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {shortcuts.map((shortcut) => (
            <Button key={shortcut.to} asChild variant="outline" size="sm">
              <Link to={shortcut.to}>
                <shortcut.icon className="h-4 w-4" />
                {shortcut.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

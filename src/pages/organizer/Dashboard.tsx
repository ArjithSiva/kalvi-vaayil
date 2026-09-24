import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { AlertTriangle, BookOpen, Calendar, CheckCircle2, Plus } from 'lucide-react';

interface OrganizerWorkshop {
  _id: string;
  title: string;
  description: string;
  status: string;
}

export default function OrganizerDashboard() {
  const { user, organizerSettings } = useAuth();
  const { t } = useTranslation();
  const [workshops, setWorkshops] = useState<OrganizerWorkshop[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setState('loading');
    api
      .get('/workshops', { params: { organizer: user?._id } })
      .then((res) => {
        setWorkshops(res.data.workshops || []);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [user]);

  const published = workshops.filter((w) => w.status === 'published').length;
  const drafts = workshops.filter((w) => w.status === 'draft').length;

  const cards = [
    { title: t('organizer.dashboard.myWorkshops'), value: workshops.length, icon: BookOpen },
    { title: t('workshop.status.published'), value: published, icon: CheckCircle2 },
    { title: t('workshop.status.draft'), value: drafts, icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('organizer.dashboard.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('organizer.dashboard.subtitle')}
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/organizer/workshops">
            <Plus className="h-4 w-4" />
            {t('organizer.workshops.create')}
          </Link>
        </Button>
      </header>

      {/* Access window / quota notice */}
      {organizerSettings && !organizerSettings.isActive && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex items-start gap-3 p-4 sm:p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div className="min-w-0">
              <p className="font-medium text-warning">
                {t('organizer.dashboard.accessInactive')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('organizer.dashboard.accessInactiveHint')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} variant="interactive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold sm:text-3xl">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizerSettings?.maxWorkshopsPerWeek ? (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t('organizer.dashboard.quota')}</p>
              <p className="text-sm text-muted-foreground">
                {t('organizer.dashboard.quotaUsed', {
                  used: workshops.length,
                  limit: organizerSettings.maxWorkshopsPerWeek,
                })}
              </p>
            </div>
            <Badge variant="primary-soft" className="shrink-0">
              {organizerSettings.maxWorkshopsPerWeek} / {t('organizer.dashboard.quota')}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold sm:text-xl">
          {t('organizer.workshops.title')}
        </h2>

        {state === 'loading' && <DataStateSkeleton count={4} />}

        {state === 'error' && (
          <DataState
            state="error"
            title={t('organizer.workshops.error')}
            description={t('error.description')}
          />
        )}

        {state === 'ready' && workshops.length === 0 && (
          <DataState
            state="empty"
            title={t('organizer.workshops.none')}
            description={t('organizer.workshops.noneHint')}
          />
        )}

        {state === 'ready' && workshops.length > 0 && (
          <div className="kv-grid">
            {workshops.slice(0, 6).map((workshop) => (
              <Card key={workshop._id} variant="interactive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">{workshop.title}</CardTitle>
                  <Badge
                    variant={
                      workshop.status === 'published'
                        ? 'success-soft'
                        : workshop.status === 'draft'
                          ? 'warning-soft'
                          : 'outline'
                    }
                    className="w-fit"
                  >
                    {t(`workshop.status.${workshop.status}`, { defaultValue: workshop.status })}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {workshop.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

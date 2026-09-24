import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { TodaysSessionsWidget } from '@/components/shared/TodaysSessionsWidget';
import { Award, BookOpen, Calendar, Compass, ArrowRight } from 'lucide-react';

interface Registration {
  _id: string;
  workshop?: {
    _id: string;
    title: string;
    description: string;
    status: string;
    schedule?: { endDate: string };
    organizer?: { name?: string } | string;
  };
}

export default function ParticipantDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setState('loading');
    api
      .get('/registrations/my')
      .then((res) => {
        setRegistrations(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [user]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = registrations.filter((registration) => {
    const end = registration.workshop?.schedule?.endDate;
    return end && new Date(end) >= new Date(today);
  });

  const cards = [
    {
      title: t('participant.dashboard.myWorkshops'),
      value: registrations.length,
      icon: BookOpen,
    },
    { title: t('participant.dashboard.upcoming'), value: upcoming.length, icon: Calendar },
    { title: t('participant.dashboard.certificates'), value: '-', icon: Award },
  ];

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t('participant.dashboard.title')}
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('participant.dashboard.subtitle')}
        </p>
      </header>

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

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/discover">
            <Compass className="h-4 w-4" />
            {t('nav.discover')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/schedule">
            <Calendar className="h-4 w-4" />
            {t('nav.schedule')}
          </Link>
        </Button>
      </div>

      {/* Today's Sessions Widget */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold sm:text-xl">Today's Sessions</h2>
        <TodaysSessionsWidget />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold sm:text-xl">
          {t('participant.dashboard.myWorkshops')}
        </h2>

        {state === 'loading' && <DataStateSkeleton count={2} />}

        {state === 'error' && (
          <DataState
            state="error"
            title={t('error.title')}
            description={t('error.description')}
          />
        )}

        {state === 'ready' && registrations.length === 0 && (
          <DataState
            state="empty"
            title={t('participant.dashboard.none')}
            description={t('discover.empty.description')}
            actionLabel={t('participant.dashboard.discover')}
            onAction={() => navigate('/discover')}
          />
        )}

        {state === 'ready' && registrations.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {registrations.map((registration) => {
              const workshop = registration.workshop;
              const organizer =
                workshop && typeof workshop.organizer === 'object' ? workshop.organizer : null;

              return (
                <Card key={registration._id} variant="interactive">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">{workshop?.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {workshop?.status && (
                        <Badge
                          variant={
                            workshop.status === 'published'
                              ? 'success-soft'
                              : workshop.status === 'completed'
                                ? 'primary-soft'
                                : 'outline'
                          }
                        >
                          {t(`workshop.status.${workshop.status}`, {
                            defaultValue: workshop.status,
                          })}
                        </Badge>
                      )}
                      {organizer?.name && (
                        <span className="min-w-0 truncate text-sm text-muted-foreground">
                          {t('workshop.by', { name: organizer.name })}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col">
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {workshop?.description}
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-auto w-fit">
                      <Link to={`/workshops/${workshop?._id}`}>
                        {t('workshop.viewDetails')}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

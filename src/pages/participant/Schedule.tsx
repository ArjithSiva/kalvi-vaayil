import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/authContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { Calendar, Clock, ExternalLink } from 'lucide-react';

interface ScheduleSession {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  googleMeetLink: string;
  attendanceMode: string;
  workshopTitle: string;
}

export default function SchedulePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setState('loading');
    api
      .get('/registrations/my')
      .then(async (res: { data: Array<{ workshop?: { _id: string; title: string } }> }) => {
        const collected: ScheduleSession[] = [];

        for (const registration of res.data) {
          const workshop = registration.workshop;
          if (!workshop?._id) continue;

          const sessionRes = await api
            .get(`/sessions/workshop/${workshop._id}`)
            .catch(() => ({ data: [] as ScheduleSession[] }));

          collected.push(
            ...sessionRes.data.map((session) => ({
              ...session,
              workshopTitle: workshop.title,
            })),
          );
        }

        collected.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setSessions(collected);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [user]);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const todaySessions = sessions.filter((session) => session.date.startsWith(today));
  const tomorrowSessions = sessions.filter((session) => session.date.startsWith(tomorrow));
  const upcomingSessions = sessions.filter(
    (session) => session.date > today && !session.date.startsWith(tomorrow),
  );

  const SessionCard = ({ session }: { session: ScheduleSession }) => {
    const isLive =
      new Date(session.startTime) <= new Date() && new Date(session.endTime) >= new Date();
    const isSoon =
      new Date(session.startTime).getTime() - Date.now() <= 15 * 60 * 1000 &&
      new Date(session.startTime).getTime() > Date.now();

    return (
      <Card variant={isLive ? 'elevated' : 'default'} className={isLive ? 'border-primary/50' : ''}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{session.title}</h3>
              {isLive && <Badge variant="success-soft">{t('attendance.present')}</Badge>}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{session.workshopTitle}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {new Date(session.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' - '}
              {new Date(session.endTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {isLive && session.googleMeetLink && (
            <Button asChild size="sm" className="shrink-0">
              <a href={session.googleMeetLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                {t('schedule.joinNow')}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('participant.schedule.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('participant.schedule.subtitle')}
        </p>
      </header>

      {state === 'loading' && <DataStateSkeleton count={3} />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('participant.schedule.error')}
          description={t('error.description')}
        />
      )}

      {state === 'ready' && sessions.length === 0 && (
        <DataState
          state="empty"
          title={t('participant.schedule.none')}
          description={t('participant.dashboard.none')}
        />
      )}

      {state === 'ready' && sessions.length > 0 && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 shrink-0 text-primary" />
              {t('time.today')}
            </h2>
            {todaySessions.length > 0 ? (
              todaySessions.map((session) => <SessionCard key={session._id} session={session} />)
            ) : (
              <p className="text-sm text-muted-foreground">{t('schedule.noToday')}</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 shrink-0 text-primary" />
              {t('time.tomorrow')}
            </h2>
            {tomorrowSessions.length > 0 ? (
              tomorrowSessions.map((session) => (
                <SessionCard key={session._id} session={session} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t('schedule.noTomorrow')}</p>
            )}
          </section>

          {upcomingSessions.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 shrink-0 text-primary" />
                {t('time.upcoming')}
              </h2>
              {upcomingSessions.slice(0, 10).map((session) => (
                <SessionCard key={session._id} session={session} />
              ))}
            </section>
          )}
        </div>
      )}

    </div>
  );
}

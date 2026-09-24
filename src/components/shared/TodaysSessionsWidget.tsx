import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataState } from '@/components/shared/DataState';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, ArrowRight, Video, VideoOff, CalendarPlus } from 'lucide-react';
import { buildGoogleCalendarUrl, downloadIcsFile } from '@/utils/calendar';

interface Session {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  googleMeetLink?: string;
  workshop: {
    _id: string;
    title: string;
    mode: string;
  };
}

function useIsLive(startTime: string, endTime: string) {
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setIsLive(now >= new Date(startTime).getTime() && now <= new Date(endTime).getTime());
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);
  return isLive;
}

function SessionRow({ session }: { session: Session }) {
  const { t } = useTranslation();
  const isLive = useIsLive(session.startTime, session.endTime);
  const hasMeetLink = !!session.googleMeetLink;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:bg-secondary/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{session.title}</p>
          {isLive && (
            <Badge variant="success-soft" className="shrink-0 text-xs">
              {t('session.live')}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{session.workshop.title}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {new Date(session.startTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Badge>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Add to calendar">
              <CalendarPlus className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(buildGoogleCalendarUrl({
              title: session.title,
              description: session.workshop.title,
              startTime: session.startTime,
              endTime: session.endTime,
              googleMeetLink: session.googleMeetLink,
            }), '_blank')}>
              <Calendar className="h-4 w-4" />
              Google Calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadIcsFile({
              title: session.title,
              description: session.workshop.title,
              startTime: session.startTime,
              endTime: session.endTime,
              googleMeetLink: session.googleMeetLink,
            })}>
              <Calendar className="h-4 w-4" />
              {t('calendar.downloadIcs')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {hasMeetLink ? (
          <Button asChild size="sm">
            <a href={session.googleMeetLink} target="_blank" rel="noopener noreferrer">
              <Video className="h-3.5 w-3.5" />
              {t('schedule.joinNow')}
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <VideoOff className="h-3.5 w-3.5" />
            {t('session.noMeetLink')}
          </Button>
        )}
        <Button asChild variant="ghost" size="icon-sm">
          <Link to={`/workshops/${session.workshop._id}`} aria-label="View workshop">
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function TodaysSessionsWidget() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    api
      .get('/sessions/today')
      .then((res) => {
        setSessions(Array.isArray(res.data) ? res.data.slice(0, 5) : []);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  if (state === 'loading') {
    return <DataState state="loading" title={t('common.loading')} />;
  }

  if (state === 'error') {
    return <DataState state="error" title={t('common.error')} />;
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('schedule.noToday')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          {t('participant.dashboard.upcoming')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((session) => (
          <SessionRow key={session._id} session={session} />
        ))}
      </CardContent>
    </Card>
  );
}

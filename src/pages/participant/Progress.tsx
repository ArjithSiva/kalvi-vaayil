import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/authContext';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { BarChart3, ClipboardList, Flame } from 'lucide-react';

interface AttendanceSummary {
  percentage: number;
  presentSessions: number;
  totalSessions: number;
}

export default function ProgressPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<
    Array<{ _id: string; workshop?: { _id: string; title: string } }>
  >([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceSummary>>({});
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setState('loading');
    api
      .get('/registrations/my')
      .then(async (res) => {
        setRegistrations(res.data);
        const collected: Record<string, AttendanceSummary> = {};

        for (const registration of res.data) {
          if (!registration.workshop?._id) continue;
          try {
            const attendanceRes = await api.get(
              `/attendance/workshop/${registration.workshop._id}/user/${user?._id}`,
            );
            collected[registration.workshop._id] = attendanceRes.data;
          } catch {
            // A single workshop without attendance data must not blank the page.
          }
        }

        setAttendanceData(collected);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [user]);

  const averageAttendance =
    registrations.length > 0
      ? Math.round(
          Object.values(attendanceData).reduce(
            (sum, entry) => sum + (entry.percentage || 0),
            0,
          ) / registrations.length,
        )
      : 0;

  const cards = [
    {
      title: t('participant.progress.activeWorkshops'),
      value: String(registrations.length),
      icon: BarChart3,
    },
    {
      title: t('participant.progress.avgAttendance'),
      value: `${averageAttendance}%`,
      icon: Flame,
    },
    { title: t('participant.progress.assignments'), value: '-', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('participant.progress.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('participant.progress.subtitle')}
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold sm:text-xl">
          {t('participant.progress.workshopProgress')}
        </h2>

        {state === 'loading' && <DataStateSkeleton count={3} />}

        {state === 'error' && (
          <DataState
            state="error"
            title={t('participant.progress.error')}
            description={t('error.description')}
          />
        )}

        {state === 'ready' && registrations.length === 0 && (
          <DataState
            state="empty"
            title={t('participant.progress.none')}
            description={t('participant.progress.noData')}
          />
        )}

        {state === 'ready' &&
          registrations.map((registration) => {
            const attendance = attendanceData[registration.workshop?._id ?? ''];
            const percentage = attendance?.percentage ?? 0;

            return (
              <Card key={registration._id}>
                <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base sm:text-lg">
                    {registration.workshop?.title}
                  </CardTitle>
                  <Badge variant={percentage >= 90 ? 'success-soft' : 'warning-soft'}>
                    {percentage}%
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('participant.progress.attendance')}
                    </span>
                    <span className="font-medium">{percentage}%</span>
                  </div>

                  <Progress value={percentage} className="h-2" />

                  <p className="text-xs text-muted-foreground">
                    {t('participant.progress.sessionsAttended', {
                      present: attendance?.presentSessions ?? 0,
                      total: attendance?.totalSessions ?? 0,
                    })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
      </section>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DataState } from '@/components/shared/DataState';
import { BarChart3, Users, BookOpen, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalWorkshops: number;
    totalRegistrations: number;
    totalSessions: number;
    totalOrganizers: number;
    avgAttendanceRate: number;
  };
  monthlyEvents: Array<{
    _id: { year: number; month: number };
    count: number;
    physical: number;
    online: number;
    hybrid: number;
  }>;
  organizerStats: Array<{
    organizer: { _id: string; name: string; email: string } | null;
    totalWorkshops: number;
    totalCapacity: number;
    totalSessions: number;
    avgAttendanceRate: number;
    totalRegistrations: number;
  }>;
}

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [months, setMonths] = useState('6');
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api
      .get('/analytics', { params: { months: Number(months) } })
      .then((res) => setData(res.data))
      .catch(() => setFailed(true));
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) {
    return (
      <DataState
        state="error"
        title={t('admin.analytics.error')}
        description={t('error.description')}
        actionLabel={t('common.retry')}
        onAction={load}
      />
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        {t('admin.analytics.loading')}
      </div>
    );
  }

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const summaryCards = [
    { title: t('admin.analytics.workshops'), value: data.summary.totalWorkshops, icon: BookOpen },
    { title: t('admin.analytics.registrations'), value: data.summary.totalRegistrations, icon: Users },
    { title: t('admin.analytics.sessions'), value: data.summary.totalSessions, icon: BarChart3 },
    { title: t('admin.analytics.organizers'), value: data.summary.totalOrganizers, icon: Users },
    { title: t('admin.analytics.avgAttendance'), value: `${data.summary.avgAttendanceRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header + period picker */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.analytics.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('admin.analytics.subtitle')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('admin.analytics.period')}</span>
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">{t('admin.analytics.last3')}</SelectItem>
              <SelectItem value="6">{t('admin.analytics.last6')}</SelectItem>
              <SelectItem value="12">{t('admin.analytics.last12')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.title}>
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

      {/* Monthly breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            {t('admin.analytics.monthlyTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="kv-scroll-x">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('admin.analytics.month')}</TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    {t('admin.analytics.total')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    {t('admin.analytics.physical')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    {t('admin.analytics.online')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    {t('admin.analytics.hybrid')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyEvents.map((month) => (
                  <TableRow key={`${month._id.year}-${month._id.month}`}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {monthNames[month._id.month - 1]} {month._id.year}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{month.count}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{month.physical}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="primary-soft">{month.online}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{month.hybrid}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.monthlyEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      {t('admin.analytics.noEvents')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Per-organizer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            {t('admin.analytics.organizerTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="kv-scroll-x">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    {t('admin.analytics.organizer')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    {t('admin.analytics.workshops')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    {t('admin.analytics.sessions')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    {t('admin.analytics.registrations')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center">
                    {t('admin.analytics.avgAttendance')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.organizerStats.map((stat) => (
                  <TableRow key={stat.organizer?._id || 'unknown'}>
                    <TableCell className="min-w-[180px]">
                      <div className="font-medium">
                        {stat.organizer?.name || t('admin.analytics.unknown')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stat.organizer?.email || ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{stat.totalWorkshops}</TableCell>
                    <TableCell className="text-center">{stat.totalSessions}</TableCell>
                    <TableCell className="text-center">{stat.totalRegistrations}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={stat.avgAttendanceRate >= 90 ? 'success-soft' : 'warning-soft'}
                      >
                        {stat.avgAttendanceRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.organizerStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      {t('admin.analytics.noOrganizers')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

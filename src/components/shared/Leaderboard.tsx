import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataState } from '@/components/shared/DataState';
import { Award, Medal, Star, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  attendancePercent: number;
  avgTaskScore: number;
  compositeScore: number;
}

export function Leaderboard() {
  const { id: workshopId } = useParams();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    api.get(`/workshops/${workshopId}/leaderboard`)
      .then((res) => {
        setEntries(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [workshopId]);

  if (state === 'loading') {
    return <DataState state="loading" title={t('common.loading')} />;
  }

  if (state === 'error') {
    return <DataState state="error" title={t('common.error')} />;
  }

  if (entries.length === 0) {
    return <DataState state="empty" title={t('leaderboard.empty')} />;
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="flex h-5 w-5 items-center justify-center text-sm font-semibold text-muted-foreground">{rank}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Award className="h-5 w-5 text-primary" />
          {t('leaderboard.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div
              key={entry.userId}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:bg-secondary/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                {getRankBadge(index + 1)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{entry.userName}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {t('leaderboard.attendance')}: {entry.attendancePercent}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {t('leaderboard.tasks')}: {entry.avgTaskScore}%
                  </span>
                </div>
              </div>

              <Badge variant="primary-soft" className="shrink-0">
                {entry.compositeScore} {t('leaderboard.points')}
              </Badge>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t('leaderboard.formula')}
        </p>
      </CardContent>
    </Card>
  );
}

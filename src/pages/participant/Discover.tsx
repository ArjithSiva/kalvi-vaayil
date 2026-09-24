import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { FilterBar, type FilterState } from '@/components/shared/FilterBar';
import { Search, Users, Calendar, Monitor, MapPin, Blend } from 'lucide-react';
import type { Workshop } from '@/types';

const defaultFilters: FilterState = {
  mode: 'all',
  dateRange: 'all',
  classes: 'all',
  organizer: 'all',
};

export default function DiscoverPage() {
  const { t } = useTranslation();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const load = useCallback((query = '', currentFilters = defaultFilters) => {
    setState('loading');
    const params: Record<string, string> = { status: 'published', limit: '50' };
    if (query) params.search = query;
    if (currentFilters.mode && currentFilters.mode !== 'all') params.mode = currentFilters.mode;
    if (currentFilters.organizer && currentFilters.organizer !== 'all') params.organizer = currentFilters.organizer;
    if (currentFilters.classes && currentFilters.classes !== 'all') params.totalClassesCount = currentFilters.classes;

    // Date range
    if (currentFilters.dateRange && currentFilters.dateRange !== 'all') {
      const now = new Date();
      if (currentFilters.dateRange === 'today') {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        params.startDate = now.toISOString();
        params.endDate = endOfDay.toISOString();
      } else if (currentFilters.dateRange === 'week') {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        params.startDate = now.toISOString();
        params.endDate = weekEnd.toISOString();
      } else if (currentFilters.dateRange === 'month') {
        const monthEnd = new Date(now);
        monthEnd.setDate(monthEnd.getDate() + 30);
        params.startDate = now.toISOString();
        params.endDate = monthEnd.toISOString();
      }
    }

    api
      .get('/workshops', { params })
      .then((res) => {
        setWorkshops(res.data.workshops || []);
        setTotal(res.data.total || 0);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  useEffect(() => {
    load(search, filters);
  }, [load, filters]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    load(search, filters);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const modeIcon = (mode: string) => {
    if (mode === 'online') return <Monitor className="h-3.5 w-3.5" />;
    if (mode === 'physical') return <MapPin className="h-3.5 w-3.5" />;
    return <Blend className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('discover.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t('discover.subtitle')}</p>
      </header>

      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('discover.searchPlaceholder')}
            className="h-11 pl-10"
            aria-label={t('common.search')}
          />
        </div>
        <Button type="submit" className="h-11 shrink-0">
          {t('common.search')}
        </Button>
      </form>

      <FilterBar filters={filters} onFilterChange={handleFilterChange} />

      {state === 'ready' && (
        <p className="text-sm text-muted-foreground">{t('discover.found', { count: total })}</p>
      )}

      {state === 'loading' && <DataStateSkeleton />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('discover.error.title')}
          description={t('discover.error.description')}
          actionLabel={t('common.retry')}
          onAction={() => load(search, filters)}
        />
      )}

      {state === 'ready' && workshops.length === 0 && (
        <DataState
          state="empty"
          title={t('discover.empty.title')}
          description={t('discover.empty.description')}
        />
      )}

      {state === 'ready' && workshops.length > 0 && (
        <div className="kv-grid">
          {workshops.map((workshop) => {
            const organizer =
              typeof workshop.organizer === 'object' ? workshop.organizer : null;

            return (
              <Card key={workshop._id} variant="interactive" className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base leading-snug sm:text-lg">
                    {workshop.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {organizer?.name && (
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {organizer.name[0] || '?'}
                        </span>
                        <span className="min-w-0 truncate text-sm text-muted-foreground">
                          {organizer.name}
                        </span>
                      </div>
                    )}
                    <Badge variant="outline" className="ml-auto gap-1 text-xs">
                      {modeIcon(workshop.mode)}
                      {t(`filter.mode${workshop.mode.charAt(0).toUpperCase() + workshop.mode.slice(1)}`, {
                        defaultValue: workshop.mode,
                      })}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col">
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {workshop.description}
                  </p>

                  {workshop.topics?.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {workshop.topics.slice(0, 3).map((topic) => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {t('workshop.spots', { count: workshop.capacity })}
                    </span>
                    {workshop.schedule?.startDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {new Date(workshop.schedule.startDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <Button asChild className="mt-auto w-full">
                    <Link to={`/workshops/${workshop._id}`}>{t('workshop.viewDetails')}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

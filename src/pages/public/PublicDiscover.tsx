import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { FilterBar, type FilterState } from '@/components/shared/FilterBar';
import { Search, Users, Calendar, MapPin, LogIn } from 'lucide-react';
import type { Workshop } from '@/types';

type LoadState = 'loading' | 'ready' | 'error';

export default function PublicDiscover() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>('loading');
  const [filters, setFilters] = useState<FilterState>({
    mode: 'all',
    dateRange: 'all',
    classes: 'all',
    organizer: 'all',
  });

  const load = useCallback((query = '', filterState = filters) => {
    setState('loading');
    const params: Record<string, string> = {
      status: 'published',
      search: query,
      limit: '20',
    };
    if (filterState.mode !== 'all') params.mode = filterState.mode;
    if (filterState.organizer !== 'all') params.organizer = filterState.organizer;

    api
      .get('/workshops', { params })
      .then((res) => {
        setWorkshops(res.data.workshops || []);
        setTotal(res.data.total || 0);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [filters]);

  useEffect(() => {
    load(search, filters);
  }, [load, search, filters]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    load(search);
  };

  const handleRegisterClick = (workshopId: string) => {
    if (user) {
      navigate(`/workshops/${workshopId}`);
    } else {
      navigate(`/login?redirect=/workshops/${workshopId}`);
    }
  };

  return (
    <div className="kv-container kv-section flex-1">
      {/* Heading */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{t('discover.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {t('discover.subtitle')}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-2 sm:flex-row">
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
        <Button type="submit" className="h-11 shrink-0 sm:w-auto">
          {t('common.search')}
        </Button>
      </form>

      {/* Filters */}
      <div className="mb-6">
        <FilterBar filters={filters} onFilterChange={setFilters} />
      </div>

      {state === 'ready' && (
        <p className="mb-4 text-sm text-muted-foreground">
          {t('discover.found', { count: total })}
        </p>
      )}

      {/* Content */}
      {state === 'loading' && <DataStateSkeleton />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('discover.error.title')}
          description={t('discover.error.description')}
          actionLabel={t('common.retry')}
          onAction={() => load(search)}
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
            const mode =
              (workshop as Workshop & { mode?: string }).mode || 'online';

            return (
              <Card key={workshop._id} variant="interactive" className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="primary-soft">
                      {t(`workshop.mode.${mode}`, { defaultValue: mode })}
                    </Badge>
                    {workshop.status && (
                      <Badge variant="outline">
                        {t(`workshop.status.${workshop.status}`, {
                          defaultValue: workshop.status,
                        })}
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base leading-snug sm:text-lg">
                    {workshop.title}
                  </CardTitle>

                  {organizer && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {organizer.name?.[0] || '?'}
                      </span>
                      <span className="min-w-0 truncate text-sm text-muted-foreground">
                        {organizer.name}
                      </span>
                    </div>
                  )}
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
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {t(`workshop.mode.${mode}`, { defaultValue: mode })}
                    </span>
                    {workshop.schedule?.startDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {new Date(workshop.schedule.startDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <Button
                    className="mt-auto w-full"
                    onClick={() => handleRegisterClick(workshop._id)}
                  >
                    {user ? (
                      t('workshop.register')
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        {t('discover.loginToRegister')}
                      </>
                    )}
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

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataState } from '@/components/shared/DataState';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';

interface QuotaRequest {
  _id: string;
  organizer: { _id: string; name: string; email: string };
  type: string;
  currentLimit: number;
  requestedLimit: number;
  reason: string;
  status: string;
  reviewNote: string;
  createdAt: string;
}

const FILTERS = ['pending', 'approved', 'rejected', 'all'] as const;

export default function QuotaInbox() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<QuotaRequest[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [failed, setFailed] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<QuotaRequest | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    setFailed(false);
    const endpoint = filter === 'pending' ? '/quota-requests/pending' : '/quota-requests/all';
    const params = filter !== 'pending' ? { status: filter } : {};
    api
      .get(endpoint, { params })
      .then((res) => setRequests(res.data))
      .catch(() => setFailed(true));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!reviewTarget) return;
    await api.post(`/quota-requests/${reviewTarget._id}/review`, { status, reviewNote: note });
    setReviewTarget(null);
    setNote('');
    load();
  };

  const filterLabel = (value: string) => {
    if (value === 'all') return t('common.all');
    return t(`admin.quota.${value}`);
  };

  const typeLabel = (type: string) => {
    if (type === 'physical') return t('admin.quota.physicalType');
    if (type === 'online') return t('admin.quota.onlineType');
    return t('admin.quota.workshopType');
  };

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="h-3.5 w-3.5" />;
    if (status === 'rejected') return <XCircle className="h-3.5 w-3.5" />;
    return <Clock className="h-3.5 w-3.5" />;
  };

  const statusVariant = (status: string) => {
    if (status === 'approved') return 'success-soft' as const;
    if (status === 'rejected') return 'destructive' as const;
    return 'warning-soft' as const;
  };

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.quota.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('admin.quota.subtitle')}
        </p>
      </header>

      {/* Filters — horizontally scrollable so four Tamil labels never crush */}
      <div className="kv-scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 sm:w-auto">
          {FILTERS.map((value) => (
            <Button
              key={value}
              variant={filter === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(value)}
              className="shrink-0"
            >
              {filterLabel(value)}
            </Button>
          ))}
        </div>
      </div>

      {failed && (
        <DataState
          state="error"
          title={t('admin.quota.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {!failed && requests.length === 0 && (
        <DataState
          state="empty"
          title={t('admin.quota.noRequests', { status: filterLabel(filter) })}
        />
      )}

      {requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request._id} variant="interactive">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {request.organizer?.name || t('admin.analytics.unknown')}
                    </span>
                    <Badge variant="outline">{typeLabel(request.type)}</Badge>
                    <Badge variant={statusVariant(request.status)}>
                      {statusIcon(request.status)}
                      {t(`admin.quota.${request.status}`, { defaultValue: request.status })}
                    </Badge>
                  </div>

                  <p className="truncate text-sm text-muted-foreground">
                    {request.organizer?.email}
                  </p>

                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{t('admin.quota.currentLimit')}:</span>
                    <span>{request.currentLimit}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold text-primary">{request.requestedLimit}</span>
                  </p>

                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">{t('admin.quota.reason')}:</span>{' '}
                    {request.reason}
                  </p>

                  {request.reviewNote && (
                    <p className="text-xs italic text-muted-foreground">
                      {t('admin.quota.reviewNote')}: {request.reviewNote}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>

                {request.status === 'pending' && (
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() => setReviewTarget(request)}
                  >
                    {t('admin.quota.review')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review dialog */}
      <Dialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(null);
            setNote('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.quota.reviewTitle')}</DialogTitle>
          </DialogHeader>

          {reviewTarget && (
            <div className="space-y-4">
              <div className="min-w-0 rounded-lg bg-secondary/50 p-3">
                <p className="font-medium">{reviewTarget.organizer?.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {reviewTarget.organizer?.email}
                </p>
              </div>

              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{typeLabel(reviewTarget.type)}:</span>
                <span>{reviewTarget.currentLimit}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-primary">{reviewTarget.requestedLimit}</span>
              </p>

              <p className="text-sm">
                <span className="font-medium">{t('admin.quota.reason')}:</span>{' '}
                {reviewTarget.reason}
              </p>

              <div className="space-y-2">
                <Label htmlFor="review-note">
                  {t('admin.quota.reviewNote')}{' '}
                  <span className="text-muted-foreground">({t('common.optional')})</span>
                </Label>
                <Textarea
                  id="review-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('admin.quota.notePlaceholder')}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => handleReview('approved')} className="flex-1">
                  <CheckCircle className="h-4 w-4" />
                  {t('admin.quota.approve')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReview('rejected')}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4" />
                  {t('admin.quota.reject')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

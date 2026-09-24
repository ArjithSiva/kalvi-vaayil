import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { Bell, CheckCheck } from 'lucide-react';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(() => {
    setState('loading');
    api
      .get('/notifications')
      .then((res) => {
        setNotifications(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {t('participant.notifications.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('participant.notifications.subtitle')}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="shrink-0">
            <CheckCheck className="h-4 w-4" />
            {t('participant.notifications.markAllRead')}
          </Button>
        )}
      </header>

      {state === 'loading' && <DataStateSkeleton count={3} />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('error.title')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {state === 'ready' && notifications.length === 0 && (
        <DataState state="empty" title={t('participant.notifications.none')} />
      )}

      {state === 'ready' && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification._id}
              className={!notification.isRead ? 'border-primary/40 bg-primary/5' : ''}
            >
              <CardContent className="flex items-start gap-3 p-4 sm:p-6">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    notification.isRead
                      ? 'bg-secondary text-muted-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-sm ${
                        notification.isRead ? 'font-medium' : 'font-semibold'
                      }`}
                    >
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <Badge variant="primary-soft">
                        {t('participant.notifications.unread')}
                      </Badge>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

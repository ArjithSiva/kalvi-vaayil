import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataState } from '@/components/shared/DataState';
import { Plus, UserCheck, UserX } from 'lucide-react';
import type { User, OrganizerSettings } from '@/types';

interface OrganizerWithSettings extends User {
  organizerSettings: OrganizerSettings | null;
}

const emptyForm = { email: '', password: '', name: '', phone: '', maxWorkshopsPerWeek: 5, maxWorkshopsLimit: 10, maxParticipantsPerWorkshop: 100 };

export default function OrganizerManagement() {
  const { t } = useTranslation();
  const [organizers, setOrganizers] = useState<OrganizerWithSettings[]>([]);
  const [failed, setFailed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    setFailed(false);
    api
      .get('/admin/organizers')
      .then((res) => setOrganizers(res.data))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.post('/admin/organizers', form);
    setDialogOpen(false);
    setForm(emptyForm);
    load();
  };

  const toggleActive = async (organizerId: string, currentActive: boolean) => {
    await api.put(`/admin/organizers/${organizerId}/settings`, { isActive: !currentActive });
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.organizers.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('admin.organizers.subtitle')}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4" />
              {t('admin.organizers.add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.organizers.createTitle')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">{t('common.name')}</Label>
                <Input
                  id="org-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-email">{t('common.email')}</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-password">{t('auth.password')}</Label>
                <Input
                  id="org-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-phone">{t('settings.phone')}</Label>
                <Input
                  id="org-phone"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-quota">{t('admin.organizers.maxPerWeek')}</Label>
                <Input
                  id="org-quota"
                  type="number"
                  min={1}
                  value={form.maxWorkshopsPerWeek}
                  onChange={(event) =>
                    setForm({ ...form, maxWorkshopsPerWeek: Number(event.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-total-limit">{t('admin.organizers.totalLimit')}</Label>
                <Input
                  id="org-total-limit"
                  type="number"
                  min={1}
                  value={form.maxWorkshopsLimit}
                  onChange={(event) =>
                    setForm({ ...form, maxWorkshopsLimit: Number(event.target.value) || 10 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-capacity-limit">{t('admin.organizers.capacityLimit')}</Label>
                <Input
                  id="org-capacity-limit"
                  type="number"
                  min={1}
                  value={form.maxParticipantsPerWorkshop}
                  onChange={(event) =>
                    setForm({ ...form, maxParticipantsPerWorkshop: Number(event.target.value) || 100 })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                {t('common.create')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {failed && (
        <DataState
          state="error"
          title={t('admin.organizers.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {!failed && organizers.length === 0 && (
        <DataState state="empty" title={t('admin.organizers.none')} />
      )}

      <div className="grid gap-4">
        {organizers.map((organizer) => {
          const settings = organizer.organizerSettings;
          const isActive = settings?.isActive ?? false;

          return (
            <Card key={organizer._id} variant="interactive">
              <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg">{organizer.name}</CardTitle>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {organizer.email}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={isActive ? 'success-soft' : 'warning-soft'}>
                    {isActive ? t('admin.organizers.active') : t('admin.organizers.inactive')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => toggleActive(organizer._id, isActive)}
                    aria-label={
                      isActive ? t('admin.organizers.deactivate') : t('admin.organizers.activate')
                    }
                  >
                    {isActive ? (
                      <UserX className="h-4 w-4 text-destructive" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-success" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">{t('admin.organizers.limit')}</dt>
                    <dd className="font-medium">
                      {settings?.maxWorkshopsPerWeek
                        ? `${settings.maxWorkshopsPerWeek} / ${t('organizer.dashboard.quota')}`
                        : t('admin.organizers.unlimited')}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">{t('admin.organizers.totalLimit')}</dt>
                    <dd className="font-medium">
                      {settings?.maxWorkshopsLimit ?? 10}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">{t('admin.organizers.capacityLimit')}</dt>
                    <dd className="font-medium">
                      {settings?.maxParticipantsPerWorkshop ?? 100}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">{t('admin.organizers.accessFrom')}</dt>
                    <dd className="font-medium">
                      {settings?.accessFrom
                        ? new Date(settings.accessFrom).toLocaleDateString()
                        : t('admin.organizers.noAccess')}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

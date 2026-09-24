import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import type { Workshop, WorkshopCategory } from '@/types';

const emptyForm = {
  title: '',
  description: '',
  topics: '',
  type: '',
  capacity: 30,
  startDate: '',
  endDate: '',
};

export default function WorkshopList() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [categories, setCategories] = useState<WorkshopCategory[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    setState('loading');
    api
      .get('/workshops', { params: { organizer: user?._id } })
      .then((res) => {
        setWorkshops(res.data.workshops || []);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [user]);

  useEffect(() => {
    load();
    api.get('/admin/categories').then((res) => {
      const categoriesList = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setCategories(categoriesList);
    }).catch(() => undefined);
  }, [load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.post('/workshops', {
      ...form,
      topics: form.topics.split(',').map((topic) => topic.trim()).filter(Boolean),
      schedule: { startDate: form.startDate, endDate: form.endDate },
    });
    setDialogOpen(false);
    setForm(emptyForm);
    load();
  };

  const handlePublish = async (id: string) => {
    await api.post(`/registrations/workshop/${id}/publish`);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('common.confirm'))) return;
    await api.delete(`/workshops/${id}`);
    load();
  };

  const statusVariant = (status: string) => {
    if (status === 'published') return 'success-soft' as const;
    if (status === 'draft') return 'warning-soft' as const;
    if (status === 'cancelled') return 'destructive' as const;
    return 'outline' as const;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('organizer.workshops.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('organizer.workshops.subtitle')}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4" />
              {t('organizer.workshops.create')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('workshop.createTitle')}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-title">{t('workshop.title')}</Label>
                <Input
                  id="ws-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ws-desc">{t('workshop.description')}</Label>
                <Input
                  id="ws-desc"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ws-topics">{t('workshop.topics')}</Label>
                <Input
                  id="ws-topics"
                  value={form.topics}
                  onChange={(event) => setForm({ ...form, topics: event.target.value })}
                  placeholder="React, Node.js, MongoDB"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('workshop.type')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ws-capacity">{t('workshop.capacity')}</Label>
                  <Input
                    id="ws-capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(event) =>
                      setForm({ ...form, capacity: Number(event.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-start">{t('workshop.startDate')}</Label>
                  <Input
                    id="ws-start"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ws-end">{t('workshop.endDate')}</Label>
                <Input
                  id="ws-end"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                {t('common.create')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {state === 'loading' && <DataStateSkeleton count={4} />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('organizer.workshops.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {state === 'ready' && workshops.length === 0 && (
        <DataState
          state="empty"
          title={t('organizer.workshops.none')}
          description={t('organizer.workshops.noneHint')}
        />
      )}

      {state === 'ready' && workshops.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {workshops.map((workshop) => (
            <Card key={workshop._id} variant="interactive">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg">{workshop.title}</CardTitle>
                  <Badge variant={statusVariant(workshop.status)} className="mt-2">
                    {t(`workshop.status.${workshop.status}`, { defaultValue: workshop.status })}
                  </Badge>
                </div>

                <div className="flex shrink-0 gap-1">
                  {workshop.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handlePublish(workshop._id)}
                      aria-label={t('workshop.status.published')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      to={`/organizer/workshops/${workshop._id}`}
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(workshop._id)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {workshop.description}
                </p>
                {workshop.topics?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {workshop.topics.slice(0, 3).map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

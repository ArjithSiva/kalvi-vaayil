import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataState } from '@/components/shared/DataState';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { WorkshopCategory } from '@/types';

const emptyForm = {
  name: { en: '', ta: '' },
  description: { en: '', ta: '' },
};

export default function CategoryManagement() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<WorkshopCategory[]>([]);
  const [failed, setFailed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    setFailed(false);
    api
      .get('/admin/categories')
      .then((res) => setCategories(res.data))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editId) {
      await api.put(`/admin/categories/${editId}`, form);
    } else {
      await api.post('/admin/categories', form);
    }
    closeDialog();
    load();
  };

  const handleEdit = (category: WorkshopCategory) => {
    setEditId(category._id);
    setForm({ name: category.name, description: category.description });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('common.confirm'))) return;
    await api.delete(`/admin/categories/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.categories.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('admin.categories.subtitle')}
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) closeDialog();
            else setDialogOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4" />
              {t('admin.categories.add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editId ? t('admin.categories.edit') : t('admin.categories.add')}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name-en">{t('admin.categories.nameEn')}</Label>
                <Input
                  id="cat-name-en"
                  value={form.name.en}
                  onChange={(event) =>
                    setForm({ ...form, name: { ...form.name, en: event.target.value } })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-name-ta">{t('admin.categories.nameTa')}</Label>
                <Input
                  id="cat-name-ta"
                  lang="ta"
                  value={form.name.ta}
                  onChange={(event) =>
                    setForm({ ...form, name: { ...form.name, ta: event.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc-en">{t('admin.categories.descEn')}</Label>
                <Input
                  id="cat-desc-en"
                  value={form.description.en}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: { ...form.description, en: event.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc-ta">{t('admin.categories.descTa')}</Label>
                <Input
                  id="cat-desc-ta"
                  lang="ta"
                  value={form.description.ta}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: { ...form.description, ta: event.target.value },
                    })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                {editId ? t('common.save') : t('common.create')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {failed && (
        <DataState
          state="error"
          title={t('common.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {!failed && categories.length === 0 && (
        <DataState state="empty" title={t('admin.categories.none')} />
      )}

      {categories.length > 0 && (
        <div className="kv-grid">
          {categories.map((category) => (
            <Card key={category._id} variant="interactive">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <CardTitle className="text-base sm:text-lg">{category.name.en}</CardTitle>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleEdit(category)}
                    aria-label={t('common.edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(category._id)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-1">
                {category.name.ta && (
                  <p lang="ta" className="text-sm font-medium text-primary">
                    {category.name.ta}
                  </p>
                )}
                {category.description.en && (
                  <p className="text-sm text-muted-foreground">{category.description.en}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

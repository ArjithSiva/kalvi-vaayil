import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import {
  ArrowLeft, Download, FileText, Link2, Plus, Trash2, Upload,
} from 'lucide-react';

interface Resource {
  _id: string;
  title: string;
  description: string;
  type: 'pdf' | 'doc' | 'link';
  externalUrl?: string;
  uploadedBy?: { name: string };
  targetAudience: 'online' | 'physical' | 'all';
  createdAt: string;
}

export default function ResourceManagement() {
  const { id: workshopId } = useParams();
  const { t } = useTranslation();
  const [resources, setResources] = useState<Resource[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'link' as 'pdf' | 'doc' | 'link',
    externalUrl: '',
    target: 'all' as 'online' | 'physical' | 'all',
    file: null as File | null,
  });

  const load = useCallback(() => {
    setState('loading');
    api
      .get(`/resources/workshop/${workshopId}`)
      .then((res) => {
        setResources(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('type', form.type);
    formData.append('target', form.target);

    if (form.type === 'link') {
      formData.append('externalUrl', form.externalUrl);
    } else if (form.file) {
      formData.append('file', form.file);
    }

    await api.post(`/resources/workshop/${workshopId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setUploadOpen(false);
    setForm({ title: '', description: '', type: 'link', externalUrl: '', target: 'all', file: null });
    load();
  };

  const handleDelete = async (resourceId: string) => {
    if (!window.confirm(t('common.confirm'))) return;
    await api.delete(`/resources/${resourceId}`);
    load();
  };

  const handleDownload = async (resource: Resource) => {
    if (resource.type === 'link') {
      window.open(resource.externalUrl, '_blank');
      return;
    }

    const response = await api.get(`/resources/${resource._id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = resource.title;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const typeIcon = (type: string) => {
    if (type === 'link') return <Link2 className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 w-fit">
            <Link to={`/organizer/workshops/${workshopId}`}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('organizer.workshop.resources')}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('organizer.resources.subtitle')}
          </p>
        </div>

        <Button onClick={() => setUploadOpen(!uploadOpen)} className="shrink-0">
          <Plus className="h-4 w-4" />
          {t('organizer.resources.add')}
        </Button>
      </header>

      {uploadOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">{t('organizer.resources.upload')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="res-title">{t('workshop.title')}</Label>
                <Input
                  id="res-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-desc">{t('workshop.description')}</Label>
                <Input
                  id="res-desc"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('workshop.type')}</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm({ ...form, type: value as 'pdf' | 'doc' | 'link' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">{t('organizer.resources.typeLink')}</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="doc">DOC/DOCX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('organizer.resources.target')}</Label>
                  <Select
                    value={form.target}
                    onValueChange={(value) =>
                      setForm({ ...form, target: value as 'online' | 'physical' | 'all' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('organizer.resources.targetAll')}</SelectItem>
                      <SelectItem value="online">{t('organizer.resources.targetOnline')}</SelectItem>
                      <SelectItem value="physical">{t('organizer.resources.targetPhysical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.type === 'link' ? (
                <div className="space-y-2">
                  <Label htmlFor="res-url">{t('organizer.resources.externalUrl')}</Label>
                  <Input
                    id="res-url"
                    value={form.externalUrl}
                    onChange={(event) => setForm({ ...form, externalUrl: event.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t('organizer.resources.file')}</Label>
                  <Input
                    type="file"
                    accept={form.type === 'pdf' ? '.pdf' : '.doc,.docx'}
                    onChange={(event) =>
                      setForm({ ...form, file: event.target.files?.[0] || null })
                    }
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full sm:w-auto">
                <Upload className="h-4 w-4" />
                {t('organizer.resources.upload')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {state === 'loading' && <DataStateSkeleton count={4} />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('organizer.resources.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {state === 'ready' && resources.length === 0 && (
        <DataState
          state="empty"
          title={t('organizer.resources.none')}
          description={t('organizer.resources.noneHint')}
        />
      )}

      {state === 'ready' && resources.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {resources.map((resource) => (
            <Card key={resource._id} variant="interactive">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {typeIcon(resource.type)}
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">{resource.title}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{resource.type.toUpperCase()}</Badge>
                      <Badge variant="primary-soft">
                        {t(`organizer.resources.target${(resource.targetAudience || 'all').charAt(0).toUpperCase() + (resource.targetAudience || 'all').slice(1)}`)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDownload(resource)}
                    aria-label={t('certificate.download')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(resource._id)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {resource.description && (
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                )}
                {resource.externalUrl && (
                  <p className="mt-2 truncate text-xs text-primary">{resource.externalUrl}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(resource.createdAt).toLocaleDateString()}
                  {resource.uploadedBy?.name && ` · ${resource.uploadedBy.name}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

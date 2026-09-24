import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { ArrowLeft, Award, CheckCircle2, XCircle } from 'lucide-react';

interface Certificate {
  _id: string;
  user: { _id: string; name: string; email: string };
  attendancePercent: number;
  testScore?: number;
  status: 'review_ready' | 'approved' | 'rejected';
  createdAt: string;
}

export default function CertificateReview() {
  const { id: workshopId } = useParams();
  const { t } = useTranslation();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(() => {
    setState('loading');
    api
      .get(`/certificates/workshop/${workshopId}/review`)
      .then((res) => {
        setCertificates(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (certificateId: string, status: 'approved' | 'rejected') => {
    await api.post(`/certificates/${certificateId}/review`, { status });
    load();
  };

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <Button asChild variant="ghost" size="sm" className="mb-2 w-fit">
          <Link to={`/organizer/workshops/${workshopId}`}>
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('organizer.certificates.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('organizer.certificates.subtitle')}
        </p>
      </header>

      {state === 'loading' && <DataStateSkeleton count={4} />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('organizer.certificates.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {state === 'ready' && certificates.length === 0 && (
        <DataState
          state="empty"
          title={t('organizer.certificates.none')}
          description={t('organizer.certificates.noneHint')}
        />
      )}

      {state === 'ready' && certificates.length > 0 && (
        <div className="space-y-4">
          {certificates.map((certificate) => (
            <Card key={certificate._id} variant="interactive">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg">{certificate.user.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{certificate.user.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="primary-soft">
                      <Award className="h-3.5 w-3.5" />
                      {t('organizer.certificates.attendance')}: {certificate.attendancePercent}%
                    </Badge>
                    {certificate.testScore !== null && certificate.testScore !== undefined && (
                      <Badge variant="secondary">
                        {t('organizer.certificates.testScore')}: {certificate.testScore}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReview(certificate._id, 'approved')}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('organizer.certificates.approve')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReview(certificate._id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4" />
                    {t('organizer.certificates.reject')}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

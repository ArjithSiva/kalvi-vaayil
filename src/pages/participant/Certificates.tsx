import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { Award, Download, Loader2, Linkedin, Printer } from 'lucide-react';
import type { Certificate } from '@/types';

export default function CertificatesPage() {
  const { t } = useTranslation();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setState('loading');
    api
      .get('/certificates/my')
      .then((res) => {
        setCertificates(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The download endpoint is authenticated, so a plain <a href> would arrive
   * without the JWT. Fetch it as a blob through the configured axios instance
   * (which attaches the token) and hand the object URL to the browser.
   */
  const handleDownload = async (certificate: Certificate) => {
    setDownloadingId(certificate._id);
    try {
      const response = await api.get(`/certificates/${certificate._id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${certificate.certificateId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Leave the button re-enabled; the toast-free failure is enough here.
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = (certificate: Certificate) => {
    const workshopTitle = typeof certificate.workshop === 'object'
      ? certificate.workshop.title
      : 'Workshop';
    const issuedDate = certificate.issuedAt
      ? new Date(certificate.issuedAt).toLocaleDateString()
      : new Date().toLocaleDateString();
    const verifyUrl = `${window.location.origin}/verify/${certificate.certificateId}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Certificate — ${workshopTitle}</title>
<style>
  body { font-family: Georgia, serif; text-align: center; padding: 60px 40px; color: #1a1a1a; }
  .border { border: 4px double #333; padding: 60px 40px; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 32px; margin-bottom: 8px; }
  h2 { font-size: 20px; font-weight: normal; color: #555; margin-bottom: 32px; }
  .name { font-size: 28px; font-weight: bold; margin: 24px 0 8px; }
  .workshop { font-size: 18px; margin-bottom: 24px; }
  .details { font-size: 14px; color: #666; margin-top: 32px; }
  .cert-id { font-family: monospace; font-size: 12px; margin-top: 16px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="border">
  <h1>Certificate of Completion</h1>
  <h2>Kalvi Vaayil</h2>
  <p>This is to certify that</p>
  <p class="name">${certificate.user && typeof certificate.user === 'object' ? (certificate.user as { name?: string }).name || 'Participant' : 'Participant'}</p>
  <p>has successfully completed</p>
  <p class="workshop">${workshopTitle}</p>
  <p class="details">Issued on ${issuedDate}</p>
  <p class="cert-id">Certificate ID: ${certificate.certificateId}</p>
  <p class="details">Verify at: ${verifyUrl}</p>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
    printWindow.document.close();
  };

  const statusVariant = (status: string) => {
    if (status === 'approved') return 'success-soft' as const;
    if (status === 'rejected') return 'destructive' as const;
    return 'warning-soft' as const;
  };

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('participant.certificates.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('participant.certificates.subtitle')}
        </p>
      </header>

      {state === 'loading' && <DataStateSkeleton count={4} />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('participant.certificates.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {state === 'ready' && certificates.length === 0 && (
        <DataState
          state="empty"
          title={t('participant.certificates.none')}
          description={t('participant.certificates.noneHint')}
        />
      )}

      {state === 'ready' && certificates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates.map((certificate) => (
            <Card key={certificate._id} variant="interactive">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Award className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    {typeof certificate.workshop === 'object'
                      ? certificate.workshop.title
                      : t('certificate.workshop')}
                  </span>
                </CardTitle>
                <Badge variant={statusVariant(certificate.status)} className="shrink-0">
                  {t(`certificate.${certificate.status}`, { defaultValue: certificate.status })}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3">
                <dl className="space-y-1 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    <dt className="text-muted-foreground">
                      {t('participant.certificates.issued')}:
                    </dt>
                    <dd className="font-medium">
                      {certificate.issuedAt
                        ? new Date(certificate.issuedAt).toLocaleDateString()
                        : '-'}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <dt className="text-muted-foreground">
                      {t('participant.certificates.id')}:
                    </dt>
                    <dd className="min-w-0 break-all font-mono text-xs">
                      {certificate.certificateId}
                    </dd>
                  </div>
                </dl>

                {certificate.status === 'approved' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(certificate)}
                      disabled={downloadingId === certificate._id}
                    >
                      {downloadingId === certificate._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {t('certificate.download')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(certificate)}
                    >
                      <Printer className="h-4 w-4" />
                      {t('certificate.print')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const issuedDate = certificate.issuedAt ? new Date(certificate.issuedAt) : new Date();
                        const workshopTitle = typeof certificate.workshop === 'object'
                          ? certificate.workshop.title
                          : 'Workshop';
                        const certUrl = `${window.location.origin}/verify/${certificate.certificateId}`;
                        const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(workshopTitle)}&organizationName=Kalvi+Vaayil&issueYear=${issuedDate.getFullYear()}&issueMonth=${issuedDate.getMonth() + 1}&certUrl=${encodeURIComponent(certUrl)}&certId=${certificate.certificateId}`;
                        window.open(linkedInUrl, '_blank');
                      }}
                    >
                      <Linkedin className="h-4 w-4" />
                      {t('certificate.addToLinkedin')}
                    </Button>
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

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, GraduationCap, Home as HomeIcon, Linkedin, Printer } from 'lucide-react';

interface VerifyData {
  valid: boolean;
  participantName?: string;
  workshopTitle?: string;
  issuedAt?: string;
  certificateId?: string;
  message?: string;
}

export default function VerifyCertificate() {
  const { t } = useTranslation();
  const { certificateId } = useParams();
  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!certificateId) {
      setLoading(false);
      return;
    }
    api
      .get(`/certificates/verify/${certificateId}`)
      .then((res) => setData(res.data))
      .catch(() => setData({ valid: false, message: t('certificate.failed') }))
      .finally(() => setLoading(false));
  }, [certificateId, t]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card variant="elevated" className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-hero shadow-glow">
            <GraduationCap className="h-6 w-6 text-hero-foreground" />
          </span>
          <CardTitle className="text-xl sm:text-2xl">{t('certificate.title')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5 text-center">
          {data?.valid ? (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-9 w-9" />
              </span>

              <p className="text-lg font-semibold text-success">
                {t('certificate.validHeading')}
              </p>

              <dl className="space-y-2 rounded-lg bg-secondary/50 p-4 text-left text-sm">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-muted-foreground">{t('certificate.name')}:</dt>
                  <dd className="min-w-0 font-medium">{data.participantName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-muted-foreground">{t('certificate.workshop')}:</dt>
                  <dd className="min-w-0 font-medium">{data.workshopTitle}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-muted-foreground">{t('certificate.issuedOn')}:</dt>
                  <dd className="min-w-0 font-medium">
                    {data.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : '-'}
                  </dd>
                </div>
              </dl>

              {data.certificateId && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) return;
                      const issuedDate = data.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : '';
                      printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Certificate</title>
<style>body{font-family:Georgia,serif;text-align:center;padding:60px 40px}.border{border:4px double #333;padding:60px 40px;max-width:700px;margin:0 auto}h1{font-size:32px}h2{font-size:20px;font-weight:normal;color:#555}.name{font-size:28px;font-weight:bold;margin:24px 0}.workshop{font-size:18px}.details{font-size:14px;color:#666;margin-top:32px}@media print{body{padding:20px}}</style></head>
<body><div class="border"><h1>Certificate of Completion</h1><h2>Kalvi Vaayil</h2><p>This certifies that</p><p class="name">${data.participantName || ''}</p><p>completed</p><p class="workshop">${data.workshopTitle || ''}</p><p class="details">Issued: ${issuedDate}</p><p class="details">Verify: ${window.location.href}</p></div>
<script>window.onload=function(){window.print();}</script></body></html>`);
                      printWindow.document.close();
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    {t('certificate.print')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const issuedDate = data.issuedAt ? new Date(data.issuedAt) : new Date();
                      const certUrl = window.location.href;
                      const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(data.workshopTitle || '')}&organizationName=Kalvi+Vaayil&issueYear=${issuedDate.getFullYear()}&issueMonth=${issuedDate.getMonth() + 1}&certUrl=${encodeURIComponent(certUrl)}&certId=${data.certificateId}`;
                      window.open(linkedInUrl, '_blank');
                    }}
                  >
                    <Linkedin className="h-4 w-4" />
                    {t('certificate.addToLinkedin')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <XCircle className="h-9 w-9" />
              </span>

              <p className="text-lg font-semibold text-destructive">
                {t('certificate.invalidHeading')}
              </p>

              <p className="text-sm text-muted-foreground">
                {data?.message || t('certificate.couldNotVerify')}
              </p>
            </>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <HomeIcon className="h-4 w-4" />
              {t('notFound.actions.backHome')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

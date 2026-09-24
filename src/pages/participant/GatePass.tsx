import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/shared/DataState';
import { Download, QrCode } from 'lucide-react';

export default function GatePass() {
  const { workshopId } = useParams();
  const { t } = useTranslation();
  const [gatePass, setGatePass] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    api.post(`/registrations/${workshopId}/gate-pass`)
      .then((res) => {
        setGatePass(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [workshopId]);

  const handleDownload = () => {
    if (!gatePass) return;

    // Create a simple HTML page with QR code for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Gate Pass - ${gatePass.workshop}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .qr { font-size: 200px; margin: 20px 0; }
            .details { margin-top: 20px; }
            .token { font-family: monospace; font-size: 12px; word-break: break-all; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Gate Pass</h1>
          <h2>${gatePass.workshop}</h2>
          <div class="qr">📱</div>
          <div class="details">
            <p><strong>${t('common.name')}:</strong> ${gatePass.userName}</p>
            <p><strong>${t('certificate.workshop')}:</strong> ${gatePass.workshop}</p>
          </div>
          <div class="token">
            <p>Token: ${gatePass.token}</p>
          </div>
          <p style="margin-top: 40px; color: #666;">
            Show this QR code at the venue entrance
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (state === 'loading') {
    return <DataState state="loading" title={t('common.loading')} />;
  }

  if (state === 'error') {
    return <DataState state="error" title={t('common.error')} />;
  }

  return (
    <div className="kv-container kv-section">
      <Card variant="gradient">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-2xl bg-primary/10">
            <QrCode className="h-20 w-20 text-primary" />
          </div>

          <h1 className="text-2xl font-bold">{t('gatepass.title')}</h1>
          <p className="mt-2 text-muted-foreground">{gatePass.workshop}</p>

          <div className="mx-auto mt-6 max-w-md space-y-3 rounded-lg bg-secondary/50 p-4 text-left">
            <div>
              <p className="text-sm text-muted-foreground">{t('common.name')}</p>
              <p className="font-semibold">{gatePass.userName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('certificate.workshop')}</p>
              <p className="font-semibold">{gatePass.workshop}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('gatepass.status')}</p>
              <p className="font-semibold text-success">
                {gatePass.valid ? t('gatepass.valid') : t('gatepass.used')}
              </p>
            </div>
          </div>

          <Button onClick={handleDownload} className="mt-6" size="lg">
            <Download className="h-5 w-5" />
            {t('gatepass.download')}
          </Button>

          <p className="mt-4 text-xs text-muted-foreground">
            {t('gatepass.instructions')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface QRScannerProps {
  sessionId: string;
  onScanSuccess?: (result: { userId: string; status: string }) => void;
}

/**
 * Camera-based attendance check-in.
 *
 * Renders a plain section rather than its own Card, so it can be embedded inside
 * the session card without nesting two bordered surfaces.
 */
export function QRScanner({ sessionId, onScanSuccess }: QRScannerProps) {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = `qr-scanner-${sessionId}`;

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // Cleanup errors are not actionable — the element is being torn down.
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setScanning(true);
    setLastResult(null);

    // The container must exist in the DOM before Html5Qrcode attaches to it.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          setProcessing(true);

          try {
            const { data } = await api.post('/attendance/qr', { qrToken: decodedText });
            setLastResult({ success: true, message: t('qr.success') });
            onScanSuccess?.({ userId: data.user, status: 'present' });
          } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setLastResult({
              success: false,
              message: e.response?.data?.error || t('qr.error'),
            });
          } finally {
            setProcessing(false);
          }
        },
        () => {
          // Fires on every frame without a match — deliberately ignored.
        },
      );
    } catch {
      setLastResult({ success: false, message: t('qr.permissionHint') });
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => undefined);
        } catch {
          // Ignore teardown races.
        }
      }
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Camera className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t('qr.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('qr.scanning')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!scanning ? (
          <Button onClick={startScanner} disabled={processing}>
            <Camera className="h-4 w-4" />
            {t('qr.start')}
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopScanner}>
            <CameraOff className="h-4 w-4" />
            {t('qr.stop')}
          </Button>
        )}
      </div>

      {processing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.loading')}
        </div>
      )}

      {scanning && (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
          <div id={containerId} className="w-full" />
        </div>
      )}

      {!scanning && !lastResult && (
        <p className="text-sm text-muted-foreground">{t('qr.idle')}</p>
      )}

      {lastResult && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg p-3 ${
            lastResult.success
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {lastResult.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="min-w-0 text-sm font-medium">{lastResult.message}</span>
        </div>
      )}
    </section>
  );
}

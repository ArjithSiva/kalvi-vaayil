import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';

export default function GatePassScanner() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: { participant: { name: string; email: string }; workshop: string; session: string }; error?: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'gate-pass-scanner';
  const audioRef = useRef<AudioContext | null>(null);

  const playSuccessBeep = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => osc.stop(), 200);
    } catch {
      // Audio not supported
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);

    await new Promise((r) => setTimeout(r, 100));

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();

          try {
            const res = await api.post('/attendance/scan-gate-pass', { token: decodedText });
            playSuccessBeep();
            setResult({ success: true, data: res.data });
          } catch (err) {
            const e = err as { response?: { data?: { error?: string } } };
            setResult({ success: false, error: e.response?.data?.error || t('common.error') });
          }
        },
        () => {},
      );
    } catch {
      setResult({ success: false, error: t('qr.permissionHint') });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === 2) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Scanner stop error:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch((err) => {
            console.error('Scanner cleanup error:', err);
          });
        } catch (err) {
          console.error('Scanner cleanup error:', err);
        }
      }
    };
  }, []);

  return (
    <div className="kv-container kv-section space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('gatepass.scanner.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('gatepass.scanner.instructions')}
          </p>

          <div className="flex gap-2">
            {!scanning ? (
              <Button onClick={startScanner}>
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

          {scanning && (
            <div className="overflow-hidden rounded-xl border bg-muted/30">
              <div id={containerId} className="w-full" />
            </div>
          )}

          {result && (
            <Card className={result.success ? 'border-success/50' : 'border-destructive/50'}>
              <CardContent className="p-4">
                {result.success ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">{t('gatepass.scanner.success')}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><strong>{t('common.name')}:</strong> {result.data.participant.name}</p>
                      <p><strong>{t('common.email')}:</strong> {result.data.participant.email}</p>
                      <p><strong>{t('certificate.workshop')}:</strong> {result.data.workshop}</p>
                      <p><strong>{t('organizer.workshop.sessions')}:</strong> {result.data.session}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">{result.error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

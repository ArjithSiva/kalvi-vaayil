import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CountdownTimerProps {
  targetDate: string; // ISO date string
  onComplete?: () => void;
}

export function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const update = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        onComplete?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2 text-sm sm:text-base">
      <div className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-2">
        <span className="text-xl font-bold text-primary sm:text-2xl">{pad(timeLeft.days)}</span>
        <span className="text-xs text-muted-foreground">{t('countdown.days')}</span>
      </div>
      <span className="text-lg font-bold text-muted-foreground">:</span>
      <div className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-2">
        <span className="text-xl font-bold text-primary sm:text-2xl">{pad(timeLeft.hours)}</span>
        <span className="text-xs text-muted-foreground">{t('countdown.hours')}</span>
      </div>
      <span className="text-lg font-bold text-muted-foreground">:</span>
      <div className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-2">
        <span className="text-xl font-bold text-primary sm:text-2xl">{pad(timeLeft.minutes)}</span>
        <span className="text-xs text-muted-foreground">{t('countdown.minutes')}</span>
      </div>
      <span className="text-lg font-bold text-muted-foreground">:</span>
      <div className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-2">
        <span className="text-xl font-bold text-primary sm:text-2xl">{pad(timeLeft.seconds)}</span>
        <span className="text-xs text-muted-foreground">{t('countdown.seconds')}</span>
      </div>
    </div>
  );
}

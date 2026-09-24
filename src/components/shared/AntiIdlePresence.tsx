import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, BellRing, CheckCircle2, X } from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserNotification,
} from '@/utils/notifications';

interface PresenceChallenge {
  challengeId: string;
  sessionId: string;
  windowStart: string;
  windowEnd: string;
  sessionTitle?: string;
  workshopTitle?: string;
}

interface ActiveResponse {
  challenges: PresenceChallenge[];
  liveSessions: number;
  serverTime: string;
}

const POLL_MS = 20 * 1000;
const ALERTED_KEY = 'kv_presence_alerted';
const PROMPT_DISMISSED_KEY = 'kv_presence_prompt_dismissed';

function readAlerted(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(ALERTED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function rememberAlerted(ids: Set<string>) {
  try {
    sessionStorage.setItem(ALERTED_KEY, JSON.stringify([...ids].slice(-50)));
  } catch {
    // storage unavailable — worst case the same check alerts again after a reload
  }
}

/**
 * Anti-idle attendance checks for participants.
 *
 * Mounted once in the authenticated layout, so a check reaches the participant
 * on any page — not only while the workshop or schedule page is open. The
 * server issues each check (and drops a matching in-app notification); this
 * component polls for open checks and then:
 *  - shows a modal with a countdown to the server-issued deadline,
 *  - plays a short beep,
 *  - raises a system notification when the app is in the background or another
 *    window has focus (e.g. the participant is in Google Meet),
 *  - flashes the tab title as a last resort when notifications are blocked.
 */
export function AntiIdlePresence() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isParticipant = user?.role === 'participant';

  const [challenge, setChallenge] = useState<PresenceChallenge | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [liveSessions, setLiveSessions] = useState(0);
  const [permission, setPermission] = useState(getNotificationPermission());
  const [promptDismissed, setPromptDismissed] = useState(() => {
    try {
      return localStorage.getItem(PROMPT_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const skewRef = useRef(0); // server time minus client time, in ms
  const alertedRef = useRef<Set<string>>(readAlerted());
  const audioRef = useRef<AudioContext | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>('');

  const stopTitleFlash = useCallback(() => {
    if (titleTimerRef.current) {
      clearInterval(titleTimerRef.current);
      titleTimerRef.current = null;
      if (originalTitleRef.current) document.title = originalTitleRef.current;
    }
  }, []);

  const flashTitle = useCallback(() => {
    if (titleTimerRef.current) return;
    originalTitleRef.current = document.title;
    let on = true;
    titleTimerRef.current = setInterval(() => {
      document.title = on ? `\u{1F514} ${t('presence.title')}` : originalTitleRef.current;
      on = !on;
    }, 1000);
  }, [t]);

  const playAudioCue = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not supported or blocked by autoplay policy
    }
  }, []);

  const raiseAlert = useCallback(
    (c: PresenceChallenge) => {
      playAudioCue();
      const inBackground = document.visibilityState === 'hidden' || !document.hasFocus();
      if (!inBackground) return;

      const body = [c.workshopTitle, t('presence.message')].filter(Boolean).join(' — ');
      void sendBrowserNotification(t('presence.title'), {
        body,
        tag: `presence-${c.challengeId}`,
        requireInteraction: true,
        url: '/dashboard',
      }).then((shown) => {
        if (!shown) flashTitle();
      });
    },
    [flashTitle, playAudioCue, t],
  );

  const poll = useCallback(async () => {
    try {
      const res = await api.get<ActiveResponse>('/presence/active');
      const { challenges = [], liveSessions: live = 0, serverTime } = res.data || ({} as ActiveResponse);
      if (serverTime) skewRef.current = new Date(serverTime).getTime() - Date.now();
      setLiveSessions(live);

      const now = Date.now() + skewRef.current;
      const open = challenges.find((c) => new Date(c.windowEnd).getTime() > now);
      if (!open) {
        setChallenge(null);
        return;
      }
      setChallenge((current) => (current?.challengeId === open.challengeId ? current : open));
      if (!alertedRef.current.has(open.challengeId)) {
        alertedRef.current.add(open.challengeId);
        rememberAlerted(alertedRef.current);
        raiseAlert(open);
      }
    } catch {
      // Network hiccups are fine — the next poll will pick the check up.
    }
  }, [raiseAlert]);

  // Poll while a participant is signed in; refresh immediately when they come back.
  useEffect(() => {
    if (!isParticipant) return;
    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    const onWake = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [isParticipant, poll]);

  // Countdown to the server-issued deadline.
  useEffect(() => {
    if (!challenge) {
      setTimeLeft(0);
      setError('');
      stopTitleFlash();
      return;
    }
    const end = new Date(challenge.windowEnd).getTime();
    const tickDown = () => {
      const remaining = Math.ceil((end - (Date.now() + skewRef.current)) / 1000);
      if (remaining <= 0) {
        setChallenge(null);
      } else {
        setTimeLeft(remaining);
      }
    };
    tickDown();
    const timer = setInterval(tickDown, 1000);
    return () => clearInterval(timer);
  }, [challenge, stopTitleFlash]);

  useEffect(() => stopTitleFlash, [stopTitleFlash]);

  const handleConfirm = async () => {
    if (!challenge || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/presence/session/${challenge.sessionId}/confirm`, {
        challengeId: challenge.challengeId,
        windowStart: challenge.windowStart,
        windowEnd: challenge.windowEnd,
      });
      setChallenge(null);
      stopTitleFlash();
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } };
      setError(e.response?.data?.error || t('common.error'));
      if (e.response?.status === 400) setChallenge(null); // window closed
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnableNotifications = async () => {
    setPermission(await requestNotificationPermission());
  };

  const dismissPrompt = () => {
    setPromptDismissed(true);
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (!isParticipant) return null;

  const showPermissionPrompt =
    liveSessions > 0 && !challenge && permission === 'default' && !promptDismissed;

  return (
    <>
      {showPermissionPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:max-w-sm">
          <Card className="border-primary/40 shadow-lg">
            <CardContent className="flex items-start gap-3 p-4">
              <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">{t('presence.enablePrompt')}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={handleEnableNotifications}>
                    {t('presence.enableAction')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissPrompt}>
                    {t('presence.notNow')}
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissPrompt}
                aria-label={t('presence.notNow')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {challenge && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="presence-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 id="presence-title" className="mb-1 text-lg font-semibold">
                {t('presence.title')}
              </h3>
              {(challenge.workshopTitle || challenge.sessionTitle) && (
                <p className="mb-2 text-sm font-medium">
                  {[challenge.workshopTitle, challenge.sessionTitle].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="mb-4 text-sm text-muted-foreground">{t('presence.message')}</p>
              <div className="mb-4 text-2xl font-bold text-primary">
                {t('presence.timeLeft', { seconds: timeLeft })}
              </div>
              {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
              <Button onClick={handleConfirm} className="w-full" size="lg" disabled={submitting}>
                <CheckCircle2 className="h-5 w-5" />
                {submitting ? t('presence.confirming') : t('presence.confirm')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {confirmed && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="border-success/50 bg-success/10">
            <CardContent className="flex items-center gap-2 p-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm font-medium text-success">{t('presence.confirmed')}</span>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

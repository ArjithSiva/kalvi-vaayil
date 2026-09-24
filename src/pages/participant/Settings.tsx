import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/authContext';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Check, Moon, Sun, User, Bell } from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/utils/notifications';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState(user?.interests?.join(', ') || '');
  const [saved, setSaved] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('unsupported');

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async (checked: boolean) => {
    if (checked) {
      const result = await requestNotificationPermission();
      setNotifPermission(result);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.put('/auth/profile', {
      name,
      phone,
      bio,
      interests: interests
        .split(',')
        .map((interest) => interest.trim())
        .filter(Boolean),
    });
    await refreshUser();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguage = (language: string) => {
    api.put('/auth/profile', { language }).catch(() => undefined);
  };

  const isDark = theme === 'dark';

  return (
    <div className="max-w-2xl space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t('settings.subtitle')}</p>
      </header>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="h-5 w-5 shrink-0 text-primary" />
            {t('settings.profile')}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t('auth.name')}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">{t('common.email')}</Label>
              <Input id="profile-email" value={user?.email || ''} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">{t('settings.phone')}</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            {user?.role === 'organizer' && (
              <div className="space-y-2">
                <Label htmlFor="profile-bio">{t('settings.bio')}</Label>
                <Input
                  id="profile-bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                />
              </div>
            )}

            {user?.role === 'participant' && (
              <div className="space-y-2">
                <Label htmlFor="profile-interests">
                  {t('settings.interests')}{' '}
                  <span className="text-muted-foreground">({t('settings.interestsHint')})</span>
                </Label>
                <Input
                  id="profile-interests"
                  value={interests}
                  onChange={(event) => setInterests(event.target.value)}
                  placeholder="React, AI, Design"
                />
              </div>
            )}

            <Button type="submit" className="w-full sm:w-auto">
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('settings.saved')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{t('settings.preferences')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isDark ? (
                <Moon className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Label htmlFor="dark-mode" className="cursor-pointer">
                {t('settings.theme')}
              </Label>
            </div>
            <Switch
              id="dark-mode"
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>{t('settings.language')}</Label>
            <LanguageSwitcher
              variant="select"
              className="w-full sm:w-[180px]"
              onChange={handleLanguage}
            />
          </div>

          {isNotificationSupported() && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Label htmlFor="browser-notifs" className="cursor-pointer">
                  {t('settings.browserNotifications')}
                </Label>
              </div>
              <Switch
                id="browser-notifs"
                checked={notifPermission === 'granted'}
                onCheckedChange={handleEnableNotifications}
                disabled={notifPermission === 'denied'}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

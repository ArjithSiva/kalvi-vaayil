import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sliders, Check } from 'lucide-react';

export default function AppSettingsPage() {
  const { t } = useTranslation();
  const [value, setValue] = useState(90);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get('/admin/settings')
      .then((res) => setValue(res.data.minAttendancePercent ?? 90))
      .catch(() => undefined);
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.put('/admin/settings', { minAttendancePercent: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('admin.settings.subtitle')}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sliders className="h-5 w-5 shrink-0 text-primary" />
            {t('admin.settings.eligibility')}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="min-attendance">{t('admin.settings.minAttendance')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('admin.settings.minAttendanceHint')}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="min-attendance"
                  type="number"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(event) => setValue(Number(event.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <Button type="submit" className="w-full sm:w-auto">
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('admin.settings.saved')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

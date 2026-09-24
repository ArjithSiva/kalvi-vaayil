import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('participant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, name, role);
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setError(e.response?.data?.error || e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <Card variant="elevated" className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-hero shadow-glow">
            <GraduationCap className="h-6 w-6 text-hero-foreground" />
          </span>
          <CardTitle className="text-xl sm:text-2xl">{t('auth.registerTitle')}</CardTitle>
          <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('auth.selectRole')}</Label>
              <Tabs value={role} onValueChange={setRole}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="participant" className="text-xs sm:text-sm">
                    {t('auth.participant')}
                  </TabsTrigger>
                  <TabsTrigger value="organizer" className="text-xs sm:text-sm">
                    {t('auth.organizer')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.name')}</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@example.com"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? t('common.loading') : t('auth.register')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

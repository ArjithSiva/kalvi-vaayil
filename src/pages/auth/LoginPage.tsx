import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('participant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // /explore sends unauthenticated visitors here with the workshop they wanted,
  // so honour it instead of always dumping them on the dashboard.
  const redirectTo = searchParams.get('redirect');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, selectedRole);
      navigate(redirectTo || '/dashboard');
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: string; actualRole?: string; message?: string } };
      };
      const data = e.response?.data;
      if (data?.error === 'Role mismatch') {
        setError(t('auth.roleMismatch', { actualRole: data.actualRole, selectedRole }));
      } else {
        setError(data?.error || data?.message || t('common.error'));
      }
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
          <CardTitle className="text-xl sm:text-2xl">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('auth.selectRole')}</Label>
              <Tabs value={selectedRole} onValueChange={setSelectedRole}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="participant" className="text-xs sm:text-sm">
                    {t('auth.participant')}
                  </TabsTrigger>
                  <TabsTrigger value="organizer" className="text-xs sm:text-sm">
                    {t('auth.organizer')}
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="text-xs sm:text-sm">
                    {t('auth.admin')}
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? t('common.loading') : t('auth.login')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                {t('auth.register')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, Home as HomeIcon, MapPinOff } from 'lucide-react';

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card variant="gradient" className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPinOff className="h-7 w-7" />
          </span>

          <p className="text-4xl font-extrabold text-primary">404</p>

          <h1 className="text-xl font-semibold">{t('notFound.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('notFound.description')}</p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/">
                <HomeIcon className="h-4 w-4" />
                {t('notFound.actions.backHome')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/explore">
                <Compass className="h-4 w-4" />
                {t('discover.exploreWorkshops')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;

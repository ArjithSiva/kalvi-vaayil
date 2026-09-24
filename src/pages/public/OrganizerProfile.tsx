import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/shared/DataState';
import { Award, BookOpen, GraduationCap, Star, ExternalLink } from 'lucide-react';

export default function OrganizerProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [pastWorkshops, setPastWorkshops] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    Promise.all([
      api.get(`/organizers/${id}`),
      api.get(`/organizers/${id}/workshops`),
    ])
      .then(([profileRes, workshopsRes]) => {
        setProfile(profileRes.data);
        setPastWorkshops(workshopsRes.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [id]);

  if (state === 'loading') {
    return <DataState state="loading" title={t('common.loading')} />;
  }

  if (state === 'error') {
    return <DataState state="error" title={t('common.error')} />;
  }

  const { organizer, settings, workshops } = profile;

  return (
    <div className="kv-container kv-section space-y-6">
      {/* Profile Header */}
      <Card variant="gradient">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
              {organizer.name?.[0] || '?'}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold sm:text-3xl">{organizer.name}</h1>
              {organizer.degree && (
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  {organizer.degree}
                </p>
              )}
              {organizer.qualifications?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {organizer.qualifications.map((qual, idx) => (
                    <Badge key={idx} variant="secondary">{qual}</Badge>
                  ))}
                </div>
              )}
              {organizer.bio && (
                <p className="mt-3 text-sm text-muted-foreground">{organizer.bio}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4">
                {settings?.rating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 fill-accent text-accent" />
                    <span className="font-semibold">{settings.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({settings.totalRatings} {t('feedback.ratings')})
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  {workshops.length} {t('nav.workshops')}
                </div>
              </div>

              {organizer.socialLinks && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {organizer.socialLinks.linkedin && (
                    <Button asChild variant="outline" size="sm">
                      <a href={organizer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {organizer.socialLinks.twitter && (
                    <Button asChild variant="outline" size="sm">
                      <a href={organizer.socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                        Twitter
                      </a>
                    </Button>
                  )}
                  {organizer.socialLinks.website && (
                    <Button asChild variant="outline" size="sm">
                      <a href={organizer.socialLinks.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Workshops */}
      {workshops.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">{t('organizer.profile.currentWorkshops')}</h2>
          <div className="kv-grid">
            {workshops.map((workshop) => (
              <Card key={workshop._id} variant="interactive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">{workshop.title}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{workshop.mode}</Badge>
                    {workshop.averageRating > 0 && (
                      <Badge variant="primary-soft">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        {workshop.averageRating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{workshop.description}</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link to={`/workshops/${workshop._id}`}>
                      {t('workshop.viewDetails')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Past Workshops Gallery */}
      {pastWorkshops.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">{t('organizer.profile.pastWorkshops')}</h2>
          <div className="kv-grid">
            {pastWorkshops.map((workshop) => (
              <Card key={workshop._id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">{workshop.title}</CardTitle>
                  {workshop.highlights?.highlightsText?.length > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {workshop.highlights.highlightsText[0]}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {workshop.highlights?.images?.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {workshop.highlights.images.slice(0, 3).map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-lg bg-muted" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataState } from '@/components/shared/DataState';
import { Award, GraduationCap, Linkedin, Share2, User as UserIcon } from 'lucide-react';

interface PortfolioCertificate {
  certificateId: string;
  workshop: { _id: string; title: string; topics?: string[] } | string;
  issuedAt?: string;
  attendancePercent?: number;
  testScore?: number;
}

interface PortfolioData {
  user: {
    name: string;
    username: string;
    bio: string;
    qualifications: string[];
    interests: string[];
  };
  certificates: PortfolioCertificate[];
  completedWorkshops: number;
  skills: string[];
}

export default function StudentPortfolio() {
  const { username } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }
    api
      .get(`/auth/portfolio/${username}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [username]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <DataState state="error" title={t('portfolio.notFound')} />
      </div>
    );
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Profile Header */}
      <Card variant="elevated">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-10 w-10" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold sm:text-3xl">{data.user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">@{data.user.username}</p>
            {data.user.bio && (
              <p className="mt-2 text-sm text-muted-foreground">{data.user.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4 text-primary" />
                {data.completedWorkshops} {t('portfolio.workshops')}
              </span>
              <span className="flex items-center gap-1">
                <Award className="h-4 w-4 text-primary" />
                {data.certificates.length} {t('portfolio.certificates')}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            {t('portfolio.share')}
          </Button>
        </CardContent>
      </Card>

      {/* Skills */}
      {data.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">{t('portfolio.skills')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificates */}
      {data.certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">{t('portfolio.certificates')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.certificates.map((cert) => {
              const workshopTitle = typeof cert.workshop === 'object' ? cert.workshop.title : '';
              const issuedDate = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '';
              const certUrl = `${window.location.origin}/verify/${cert.certificateId}`;

              return (
                <div
                  key={cert.certificateId}
                  className="flex flex-col gap-3 rounded-lg border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{workshopTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {issuedDate}
                      {cert.attendancePercent != null && ` · ${cert.attendancePercent}% ${t('attendance.percentage')}`}
                      {cert.testScore != null && ` · ${cert.testScore}% ${t('organizer.certificates.testScore')}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={`/verify/${cert.certificateId}`} target="_blank" rel="noopener noreferrer">
                        {t('certificate.verify')}
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const issuedDateObj = cert.issuedAt ? new Date(cert.issuedAt) : new Date();
                        const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(workshopTitle)}&organizationName=Kalvi+Vaayil&issueYear=${issuedDateObj.getFullYear()}&issueMonth=${issuedDateObj.getMonth() + 1}&certUrl=${encodeURIComponent(certUrl)}&certId=${cert.certificateId}`;
                        window.open(linkedInUrl, '_blank');
                      }}
                    >
                      <Linkedin className="h-4 w-4" />
                      {t('certificate.addToLinkedin')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

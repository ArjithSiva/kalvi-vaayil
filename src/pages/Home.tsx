import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, BookOpen, Globe, Bot, Award, QrCode, Users, Sparkles,
} from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();

  const features = [
    { icon: BookOpen, title: t('home.features.f1.title'), desc: t('home.features.f1.desc') },
    { icon: Globe, title: t('home.features.f2.title'), desc: t('home.features.f2.desc') },
    { icon: Bot, title: t('home.features.f3.title'), desc: t('home.features.f3.desc') },
    { icon: Award, title: t('home.features.f4.title'), desc: t('home.features.f4.desc') },
    { icon: QrCode, title: t('home.features.f5.title'), desc: t('home.features.f5.desc') },
    { icon: Users, title: t('home.features.f6.title'), desc: t('home.features.f6.desc') },
  ];

  const stats = [
    { value: t('home.stats.free'), label: t('home.stats.freeLabel') },
    { value: t('home.stats.languages'), label: t('home.stats.languagesLabel') },
    { value: t('home.stats.ai'), label: t('home.stats.aiLabel') },
    { value: t('home.stats.qr'), label: t('home.stats.qrLabel') },
  ];

  const steps = [
    { step: '01', title: t('home.how.s1.title'), desc: t('home.how.s1.desc') },
    { step: '02', title: t('home.how.s2.title'), desc: t('home.how.s2.desc') },
    { step: '03', title: t('home.how.s3.title'), desc: t('home.how.s3.desc') },
  ];

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Soft gradient glow behind the headline — the gradient itself is dark,
            so it is used at low opacity rather than behind body text. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-96 gradient-hero opacity-20 blur-3xl"
        />

        <div className="kv-container relative py-14 text-center sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <Badge variant="primary-soft" className="mb-5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              {t('home.hero.badge')}
            </Badge>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient">{t('home.hero.title')}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg font-medium sm:text-xl">
              {t('home.hero.subtitle')}
            </p>

            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t('home.hero.description')}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="premium">
                <Link to="/register">
                  {t('home.hero.cta')}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/explore">
                  <BookOpen className="h-5 w-5" />
                  {t('home.hero.explore')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-card/40">
        <div className="kv-container grid grid-cols-2 gap-6 py-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 text-center">
              <div className="text-2xl font-bold text-primary sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="kv-section">
        <div className="kv-container">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              {t('home.features.title')}
            </h2>
            <p className="mt-3 text-muted-foreground">{t('home.features.subtitle')}</p>
          </div>

          <div className="kv-grid">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                variant="interactive"
                className="animate-slide-up"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <CardContent className="space-y-3 p-5 sm:p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold sm:text-lg">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="kv-section border-y border-border/60 bg-card/30">
        <div className="kv-container">
          <h2 className="mb-10 text-center text-2xl font-bold sm:mb-14 sm:text-3xl lg:text-4xl">
            {t('home.how.title')}
          </h2>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {steps.map((item) => (
              <div key={item.step} className="min-w-0 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-gold text-sm font-extrabold text-accent-foreground">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold sm:text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="kv-section">
        <div className="kv-container">
          <Card variant="elevated" className="overflow-hidden">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 gradient-hero opacity-10" />
              <CardContent className="relative px-6 py-10 text-center sm:px-12 sm:py-14">
                <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                  {t('home.cta.title')}
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                  {t('home.cta.description')}
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" variant="premium">
                    <Link to="/register">
                      {t('auth.register')}
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/login">{t('auth.login')}</Link>
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

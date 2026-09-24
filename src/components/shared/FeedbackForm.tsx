import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedbackFormProps {
  workshopId: string;
  organizerId: string;
  onSuccess?: () => void;
}

export function FeedbackForm({ workshopId, organizerId, onSuccess }: FeedbackFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [workshopRating, setWorkshopRating] = useState(0);
  const [organizerRating, setOrganizerRating] = useState(0);
  const [workshopComment, setWorkshopComment] = useState('');
  const [organizerComment, setOrganizerComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workshopRating === 0 || organizerRating === 0) return;

    setSubmitting(true);
    try {
      await api.post(`/workshops/${workshopId}/feedback`, {
        workshopRating,
        organizerRating,
        workshopComment,
        organizerComment,
      });
      toast({ title: t('feedback.submitted') });
      onSuccess?.();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-6 w-6 ${
                star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">{t('feedback.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StarRating
            value={workshopRating}
            onChange={setWorkshopRating}
            label={t('feedback.workshop')}
          />
          <StarRating
            value={organizerRating}
            onChange={setOrganizerRating}
            label={t('feedback.organizer')}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('feedback.workshopComment')}</label>
            <Textarea
              value={workshopComment}
              onChange={(e) => setWorkshopComment(e.target.value)}
              placeholder={t('feedback.workshopComment')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('feedback.organizerComment')}</label>
            <Textarea
              value={organizerComment}
              onChange={(e) => setOrganizerComment(e.target.value)}
              placeholder={t('feedback.organizerComment')}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t('common.loading') : t('feedback.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

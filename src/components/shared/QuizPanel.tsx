import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataState } from '@/components/shared/DataState';
import { Brain, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

/**
 * Ephemeral AI quiz for a workshop.
 *
 * The quiz is generated on demand and never persisted (the backend returns it
 * directly), so this component owns all of its state and can be thrown away
 * freely. Answers are graded in place instead of dumping raw JSON in an alert.
 */
export function QuizPanel({ workshopId }: { workshopId: string }) {
  const { t } = useTranslation();
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const generate = async () => {
    setLoading(true);
    setFailed(false);
    setAnswers({});

    try {
      const { data } = await api.post(`/ai/workshop/${workshopId}/quiz`, { questionCount: 5 });
      const questions: QuizQuestion[] = Array.isArray(data.quiz) ? data.quiz : [];
      setQuiz(questions.filter((question) => question?.options?.length > 0));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const answerQuestion = (index: number, option: string) => {
    setAnswers((current) => (index in current ? current : { ...current, [index]: option }));
  };

  const total = quiz?.length ?? 0;
  const answered = Object.keys(answers).length;
  const score = (quiz ?? []).reduce(
    (sum, question, index) => sum + (answers[index] === question.correctAnswer ? 1 : 0),
    0,
  );
  const complete = total > 0 && answered === total;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Brain className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">{t('workshop.ai.quiz')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('ai.empty')}</p>
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={loading}
            variant={quiz ? 'outline' : 'default'}
            className="shrink-0"
          >
            {loading ? (
              t('ai.quizGenerating')
            ) : quiz ? (
              <>
                <RefreshCw className="h-4 w-4" />
                {t('ai.tryAgain')}
              </>
            ) : (
              t('participant.workshop.generateQuiz')
            )}
          </Button>
        </CardHeader>

        {complete && (
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary/10 p-3">
              <Badge variant="primary-soft">
                {t('ai.score', { score, total })}
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {failed && (
        <DataState
          state="error"
          title={t('ai.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={generate}
        />
      )}

      {!failed && quiz && quiz.length === 0 && (
        <DataState state="empty" title={t('ai.error')} description={t('ai.empty')} />
      )}

      {quiz?.map((question, index) => {
        const chosen = answers[index];
        const isAnswered = chosen !== undefined;

        return (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base leading-snug">
                {index + 1}. {question.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {question.options.map((option) => {
                const isCorrect = option === question.correctAnswer;
                const isChosen = chosen === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answerQuestion(index, option)}
                    disabled={isAnswered}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                      !isAnswered && 'border-border hover:border-primary/40 hover:bg-secondary',
                      isAnswered && isCorrect && 'border-success/40 bg-success/10 text-success',
                      isAnswered && isChosen && !isCorrect &&
                        'border-destructive/40 bg-destructive/10 text-destructive',
                      isAnswered && !isCorrect && !isChosen && 'border-border opacity-60',
                    )}
                  >
                    {isAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    {isAnswered && isChosen && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                    <span className="min-w-0">{option}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

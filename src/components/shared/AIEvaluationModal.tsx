import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, Loader2 } from 'lucide-react';

interface AIEvaluationModalProps {
  workshopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EvaluationResult {
  summary: string;
  strengths: string[];
  improvements: string[];
  overallScore: number;
}

export function AIEvaluationModal({ workshopId, open, onOpenChange }: AIEvaluationModalProps) {
  const { t } = useTranslation();
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await api.post(`/ai/workshop/${workshopId}/evaluate`);
      setResult(res.data);
    } catch {
      setResult({
        summary: 'Evaluation failed. Please try again.',
        strengths: [],
        improvements: [],
        overallScore: 0,
      });
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Workshop Evaluation
          </DialogTitle>
        </DialogHeader>

        {!result && !evaluating && (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get an AI-powered analysis of your workshop performance, including strengths and areas
              for improvement based on participant feedback and engagement metrics.
            </p>
            <Button onClick={handleEvaluate} className="w-full">
              <Sparkles className="h-4 w-4" />
              Start Evaluation
            </Button>
          </CardContent>
        )}

        {evaluating && (
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing workshop data...</p>
          </CardContent>
        )}

        {result && !evaluating && (
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <Badge variant="primary-soft" className="text-lg">
                  {result.overallScore}/100
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </div>

            {result.strengths.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-success">Strengths</h4>
                <ul className="space-y-1">
                  {result.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-success">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.improvements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-warning">Areas for Improvement</h4>
                <ul className="space-y-1">
                  {result.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-warning">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={() => setResult(null)} variant="outline" className="w-full">
              Run Another Evaluation
            </Button>
          </CardContent>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import {
  ArrowLeft, CheckCircle2, ClipboardList, Plus, XCircle,
} from 'lucide-react';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  maxScore: number;
  createdBy?: { name: string };
}

interface Submission {
  _id: string;
  user: { _id: string; name: string; email: string };
  content: string;
  fileName?: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
}

export default function TaskManagement() {
  const { id: workshopId } = useParams();
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', maxScore: 100 });
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const load = useCallback(() => {
    setState('loading');
    api
      .get(`/assignments/workshop/${workshopId}`)
      .then((res) => {
        setAssignments(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.post(`/assignments/workshop/${workshopId}`, form);
    setCreateOpen(false);
    setForm({ title: '', description: '', dueDate: '', maxScore: 100 });
    load();
  };

  const loadSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const res = await api.get(`/assignments/${assignment._id}/submissions`);
    setSubmissions(res.data);
  };

  const handleGrade = async (submission: Submission, score: number, feedback: string) => {
    await api.post(`/assignments/${submission._id}/score`, {
      userId: submission.user._id,
      score,
      feedback,
    });
    loadSubmissions(selectedAssignment!);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 w-fit">
            <Link to={`/organizer/workshops/${workshopId}`}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('organizer.tasks.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {t('organizer.tasks.subtitle')}
          </p>
        </div>

        <Button onClick={() => setCreateOpen(!createOpen)} className="shrink-0">
          <Plus className="h-4 w-4" />
          {t('organizer.tasks.add')}
        </Button>
      </header>

      {createOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">{t('organizer.tasks.create')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">{t('organizer.tasks.title')}</Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-desc">{t('organizer.tasks.description')}</Label>
                <Input
                  id="task-desc"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="task-due">{t('organizer.tasks.dueDate')}</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-score">{t('organizer.tasks.maxScore')}</Label>
                  <Input
                    id="task-score"
                    type="number"
                    min={1}
                    value={form.maxScore}
                    onChange={(event) =>
                      setForm({ ...form, maxScore: Number(event.target.value) || 100 })
                    }
                  />
                </div>
              </div>

              <Button type="submit" className="w-full sm:w-auto">
                {t('organizer.tasks.create')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {state === 'loading' && <DataStateSkeleton count={3} />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('organizer.tasks.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {state === 'ready' && assignments.length === 0 && (
        <DataState
          state="empty"
          title={t('organizer.tasks.none')}
          description={t('organizer.tasks.noneHint')}
        />
      )}

      {state === 'ready' && assignments.length > 0 && (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment._id} variant="interactive">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg">{assignment.title}</CardTitle>
                  {assignment.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assignment.dueDate && (
                      <Badge variant="outline">
                        {t('participant.tasks.due')}: {new Date(assignment.dueDate).toLocaleDateString()}
                      </Badge>
                    )}
                    <Badge variant="primary-soft">
                      {t('organizer.tasks.maxScore')}: {assignment.maxScore}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSubmissions(assignment)}
                  className="shrink-0"
                >
                  <ClipboardList className="h-4 w-4" />
                  {t('organizer.tasks.submissions')}
                </Button>
              </CardHeader>

              {selectedAssignment?._id === assignment._id && (
                <CardContent className="space-y-3">
                  {submissions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {t('participant.tasks.none')}
                    </p>
                  ) : (
                    submissions.map((submission) => (
                      <Card key={submission._id}>
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium">{submission.user.name}</p>
                              <p className="text-xs text-muted-foreground">{submission.user.email}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(submission.submittedAt).toLocaleString()}
                              </p>
                            </div>
                            {submission.fileName && (
                              <Badge variant="outline">{submission.fileName}</Badge>
                            )}
                          </div>

                          {submission.content && (
                            <p className="mb-3 whitespace-pre-wrap text-sm">{submission.content}</p>
                          )}

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              type="number"
                              min={0}
                              max={assignment.maxScore}
                              placeholder={t('organizer.tasks.score')}
                              defaultValue={submission.score}
                              className="w-full sm:w-32"
                              id={`score-${submission._id}`}
                            />
                            <Input
                              placeholder={t('organizer.tasks.feedback')}
                              defaultValue={submission.feedback}
                              className="flex-1"
                              id={`feedback-${submission._id}`}
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const score = Number(
                                  (document.getElementById(`score-${submission._id}`) as HTMLInputElement).value,
                                );
                                const feedback = (
                                  document.getElementById(`feedback-${submission._id}`) as HTMLInputElement
                                ).value;
                                handleGrade(submission, score, feedback);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {t('organizer.tasks.grade')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

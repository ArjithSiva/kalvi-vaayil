import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataState } from '@/components/shared/DataState';
import { QuizPanel } from '@/components/shared/QuizPanel';
import { FeedbackForm } from '@/components/shared/FeedbackForm';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { Leaderboard } from '@/components/shared/Leaderboard';
import {
  ArrowLeft, Award, Bot, Brain, Calendar, CalendarPlus, CheckCircle2, Download, ExternalLink, FileText,
  Lock, Megaphone, MessageSquare, Send, Upload, Users, Clock, QrCode,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildGoogleCalendarUrl, downloadIcsFile } from '@/utils/calendar';
import type { Workshop, Session } from '@/types';

type ChatMessage = { role: string; content: string };
interface Resource {
  _id: string;
  title: string;
  description: string;
  type: 'pdf' | 'doc' | 'link';
  externalUrl?: string;
  targetAudience: 'online' | 'physical' | 'all';
  createdAt: string;
}
interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  maxScore: number;
}
interface CommunityPost {
  _id: string;
  content: string;
  isPrivate: boolean;
  author: { _id: string; name: string };
  createdAt: string;
  replies: CommunityPost[];
}
interface Announcement {
  _id?: string;
  title: string;
  message: string;
  createdAt: string;
}

export default function WorkshopDetailParticipant() {
  const { id } = useParams();
  const { t } = useTranslation();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [failed, setFailed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [userMode, setUserMode] = useState<'online' | 'physical' | 'both'>('online');
  const [postForm, setPostForm] = useState({ content: '', isPrivate: false });
  const [submitForm, setSubmitForm] = useState<{ [key: string]: { content: string; file: File | null } }>({});
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const load = useCallback(() => {
    setFailed(false);
    api.get(`/workshops/${id}`).then((res) => setWorkshop(res.data)).catch(() => setFailed(true));
    api.get(`/sessions/workshop/${id}`).then((res) => setSessions(res.data)).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    load();
    api
      .get('/registrations/my')
      .then((res) => {
        const registration = res.data.find(
          (r: { workshop?: { _id: string }; mode?: string }) => r.workshop?._id === id,
        );
        setRegistered(Boolean(registration));
        if (registration?.mode) setUserMode(registration.mode);
      })
      .catch(() => undefined);

    // Check waitlist status
    api
      .get('/waitlist/my')
      .then((res) => {
        const waitlistEntry = res.data.find(
          (w: { workshop?: { _id: string }; position?: number }) => w.workshop?._id === id,
        );
        if (waitlistEntry) setWaitlistPosition(waitlistEntry.position);
      })
      .catch(() => undefined);

    // Check if feedback already submitted
    api
      .get(`/workshops/${id}/feedback/my`)
      .then((res) => setFeedbackSubmitted(Boolean(res.data)))
      .catch(() => undefined);

    // Load resources, assignments, community posts
    api.get(`/resources/workshop/${id}`).then((res) => setResources(res.data)).catch(() => undefined);
    api.get(`/assignments/workshop/${id}`).then((res) => setAssignments(res.data)).catch(() => undefined);
    api.get(`/community/workshop/${id}`).then((res) => setCommunityPosts(res.data)).catch(() => undefined);
    api.get(`/workshops/${id}/announcements`).then((res) => setAnnouncements(res.data)).catch(() => undefined);
  }, [id, load]);

  const handleRegister = async () => {
    setRegistering(true);
    setRegisterError('');

    try {
      await api.post(`/registrations/workshop/${id}`);
      setRegistered(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setRegisterError(e.response?.data?.error || t('common.error'));
    } finally {
      setRegistering(false);
    }
  };

  const handleChat = async () => {
    if (!chatMsg.trim()) return;
    const nextHistory = [...chatHistory, { role: 'user', content: chatMsg }];
    setChatHistory(nextHistory);
    setChatMsg('');
    setChatLoading(true);

    try {
      const { data } = await api.post(`/ai/workshop/${id}/chat`, { message: chatMsg });
      setChatHistory([...nextHistory, { role: 'assistant', content: data.response }]);
    } catch {
      setChatHistory([...nextHistory, { role: 'assistant', content: t('ai.error') }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePostQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!postForm.content.trim()) return;

    await api.post(`/community/workshop/${id}`, postForm);
    setPostForm({ content: '', isPrivate: false });

    // Reload posts
    const res = await api.get(`/community/workshop/${id}`);
    setCommunityPosts(res.data);
  };

  const handleReply = async (parentPostId: string, content: string, isPrivate: boolean) => {
    await api.post(`/community/workshop/${id}`, { content, isPrivate, parentPost: parentPostId });
    const res = await api.get(`/community/workshop/${id}`);
    setCommunityPosts(res.data);
  };

  const handleAssignmentSubmit = async (assignmentId: string) => {
    const form = submitForm[assignmentId];
    if (!form || !form.content.trim()) return;

    const formData = new FormData();
    formData.append('content', form.content);
    if (form.file) formData.append('file', form.file);

    await api.post(`/assignments/${assignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setSubmitForm({ ...submitForm, [assignmentId]: { content: '', file: null } });
  };

  const handleDownloadResource = async (resource: Resource) => {
    if (resource.type === 'link') {
      window.open(resource.externalUrl, '_blank');
      return;
    }

    const response = await api.get(`/resources/${resource._id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = resource.title;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleJoinSession = async (session: Session) => {
    try {
      await api.post(`/sessions/${session._id}/join`);
      if (session.googleMeetLink) {
        window.open(session.googleMeetLink, '_blank');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    }
  };

  const handleJoinWaitlist = async () => {
    if (!id) return;
    setJoiningWaitlist(true);
    try {
      const res = await api.post(`/registrations/${id}/waitlist`);
      setWaitlistPosition(res.data.position);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const handleUnenroll = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to unenroll from this workshop?')) return;
    try {
      await api.delete(`/registrations/${id}`);
      setRegistered(false);
      setWaitlistPosition(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    }
  };

  const isSessionLiveOrSoon = (session: Session) => {
    const now = new Date();
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    const fifteenMinBefore = new Date(start.getTime() - 15 * 60 * 1000);
    return now >= fifteenMinBefore && now <= end;
  };

  const filterResourcesByMode = (resources: Resource[]) => {
    if (userMode === 'both') return resources;
    return resources.filter((r) => r.targetAudience === 'all' || r.targetAudience === userMode);
  };

  if (failed) {
    return (
      <DataState
        state="error"
        title={t('participant.workshop.notFound')}
        description={t('error.description')}
        actionLabel={t('common.retry')}
        onAction={load}
      />
    );
  }

  if (!workshop) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  const organizer = typeof workshop.organizer === 'object' ? workshop.organizer : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/discover">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </Button>

      {/* Workshop header */}
      <Card variant="gradient">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">{workshop.title}</h1>

            {organizer?.name && (
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {organizer.name[0] || '?'}
                </span>
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                  {t('workshop.by', { name: organizer.name })}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground sm:text-base">{workshop.description}</p>

          {/* Countdown timer for upcoming workshops */}
          {workshop.schedule?.startDate && new Date(workshop.schedule.startDate) > new Date() && (
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3">
              <Clock className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Starts in</p>
                <CountdownTimer targetDate={workshop.schedule.startDate} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {workshop.topics?.map((topic) => (
              <Badge key={topic} variant="secondary">
                {topic}
              </Badge>
            ))}
            <Badge variant="outline">
              <Users className="h-3.5 w-3.5" />
              {t('workshop.spots', { count: workshop.capacity })}
            </Badge>
          </div>

          {registered ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success-soft" className="px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('participant.workshop.seatBooked')}
              </Badge>
              {(workshop.mode === 'physical' || workshop.mode === 'hybrid') && (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/workshops/${id}/gate-pass`}>
                    <QrCode className="h-4 w-4" />
                    {t('gatepass.title')}
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleUnenroll}>
                Unenroll
              </Button>
            </div>
          ) : waitlistPosition ? (
            <Badge variant="warning-soft" className="px-3 py-1">
              {t('waitlist.position')}: #{waitlistPosition}
            </Badge>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleRegister} disabled={registering} variant="premium">
                  {registering ? t('common.loading') : t('participant.workshop.bookSeat')}
                </Button>
                <Button
                  onClick={handleJoinWaitlist}
                  disabled={joiningWaitlist}
                  variant="outline"
                >
                  {joiningWaitlist ? t('common.loading') : t('waitlist.join')}
                </Button>
              </div>
              {registerError && (
                <p role="alert" className="text-sm text-destructive">
                  {registerError}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="sessions">
        <div className="kv-scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="flex h-auto w-max justify-start gap-1 bg-muted p-1">
            <TabsTrigger value="sessions" className="shrink-0 gap-1.5">
              <Calendar className="h-4 w-4" />
              {t('participant.workshop.sessions')}
            </TabsTrigger>
            <TabsTrigger value="resources" className="shrink-0 gap-1.5">
              <FileText className="h-4 w-4" />
              {t('participant.workshop.resources')}
            </TabsTrigger>
            <TabsTrigger value="announcements" className="shrink-0 gap-1.5">
              <Megaphone className="h-4 w-4" />
              {t('participant.workshop.announcements')}
            </TabsTrigger>
            <TabsTrigger value="community" className="shrink-0 gap-1.5">
              <MessageSquare className="h-4 w-4" />
              {t('participant.workshop.community')}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="shrink-0 gap-1.5">
              <FileText className="h-4 w-4" />
              {t('participant.workshop.tasks')}
            </TabsTrigger>
            {registered && (
              <TabsTrigger value="chat" className="shrink-0 gap-1.5">
                <Bot className="h-4 w-4" />
                {t('participant.workshop.aiChat')}
              </TabsTrigger>
            )}
            {registered && (
              <TabsTrigger value="quiz" className="shrink-0 gap-1.5">
                <Brain className="h-4 w-4" />
                {t('participant.workshop.quiz')}
              </TabsTrigger>
            )}
            {registered && (
              <TabsTrigger value="leaderboard" className="shrink-0 gap-1.5">
                <Award className="h-4 w-4" />
                {t('leaderboard.title')}
              </TabsTrigger>
            )}
            {registered && !feedbackSubmitted && (
              <TabsTrigger value="feedback" className="shrink-0 gap-1.5">
                <MessageSquare className="h-4 w-4" />
                {t('feedback.title')}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Sessions */}
        <TabsContent value="sessions" className="space-y-3">
          {sessions.length === 0 && (
            <DataState state="empty" title={t('participant.workshop.noSessions')} />
          )}

          {sessions.map((session) => {
            const isLive =
              new Date(session.startTime) <= new Date() && new Date(session.endTime) >= new Date();

            return (
              <Card key={session._id} className={isLive ? 'border-primary/50' : ''}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{session.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(session.date).toLocaleDateString()}
                      {' · '}
                      {new Date(session.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' - '}
                      {new Date(session.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isLive && <Badge variant="success-soft">{t('attendance.present')}</Badge>}
                    <Badge variant="outline">
                      {t(`organizer.workshop.${session.attendanceMode}`, {
                        defaultValue: session.attendanceMode,
                      })}
                    </Badge>
                    {isSessionLiveOrSoon(session) && session.googleMeetLink && (
                      <Button size="sm" onClick={() => handleJoinSession(session)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('session.join')}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon-sm" aria-label="Add to calendar">
                          <CalendarPlus className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(buildGoogleCalendarUrl({
                          title: session.title,
                          description: workshop?.title,
                          startTime: session.startTime,
                          endTime: session.endTime,
                          googleMeetLink: session.googleMeetLink,
                        }), '_blank')}>
                          <Calendar className="h-4 w-4" />
                          Google Calendar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadIcsFile({
                          title: session.title,
                          description: workshop?.title,
                          startTime: session.startTime,
                          endTime: session.endTime,
                          googleMeetLink: session.googleMeetLink,
                        })}>
                          <Calendar className="h-4 w-4" />
                          {t('calendar.downloadIcs')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
                {session.resources && session.resources.length > 0 && (
                  <div className="border-t border-border/60 p-4">
                    <h4 className="mb-2 text-sm font-semibold">{t('session.resources')}</h4>
                    <div className="space-y-1.5">
                      {session.resources.map((r, idx) => (
                        <a
                          key={idx}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 rounded bg-secondary/50 px-3 py-1.5 text-sm hover:bg-secondary"
                        >
                          <span className="min-w-0 truncate">{r.title}</span>
                          <Badge variant="outline" className="shrink-0 text-xs">{r.type}</Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="resources" className="space-y-3">
          {filterResourcesByMode(resources).length === 0 ? (
            <DataState state="empty" title={t('participant.resources.none')} />
          ) : (
            filterResourcesByMode(resources).map((resource) => (
              <Card key={resource._id} variant="interactive">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {resource.type === 'link' ? <ExternalLink className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{resource.title}</p>
                    {resource.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{resource.type.toUpperCase()}</Badge>
                      <Badge variant="primary-soft">
                        {t(`organizer.resources.target${resource.targetAudience.charAt(0).toUpperCase() + resource.targetAudience.slice(1)}`)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadResource(resource)}
                    className="shrink-0"
                  >
                    {resource.type === 'link' ? (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        {t('participant.resources.open')}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        {t('participant.resources.download')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="announcements" className="space-y-3">
          {announcements.length === 0 ? (
            <DataState state="empty" title={t('participant.workshop.noAnnouncements')} />
          ) : (
            announcements.map((ann, idx) => (
              <Card key={idx} variant="interactive">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                      <h4 className="font-semibold">{ann.title}</h4>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{ann.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('participant.community.post')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePostQuestion} className="space-y-3">
                <Textarea
                  value={postForm.content}
                  onChange={(event) => setPostForm({ ...postForm, content: event.target.value })}
                  placeholder={t('participant.workshop.askPlaceholder')}
                  required
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={postForm.isPrivate}
                      onChange={(event) => setPostForm({ ...postForm, isPrivate: event.target.checked })}
                    />
                    {t('participant.community.postPrivate')}
                  </label>
                  <Button type="submit" size="sm">
                    <MessageSquare className="h-4 w-4" />
                    {t('participant.community.post')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {communityPosts.length === 0 ? (
            <DataState
              state="empty"
              title={t('participant.community.none')}
              description={t('participant.community.beFirst')}
            />
          ) : (
            <div className="space-y-3">
              {communityPosts.map((post) => (
                <Card key={post._id}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{post.author.name}</p>
                          {post.isPrivate && (
                            <Badge variant="warning-soft">
                              <Lock className="h-3 w-3" />
                              {t('participant.community.private')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-sm">{post.content}</p>

                    {post.replies.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-border pl-4">
                        {post.replies.map((reply) => (
                          <div key={reply._id} className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{reply.author.name}</p>
                              {reply.isPrivate && (
                                <Badge variant="warning-soft">
                                  <Lock className="h-3 w-3" />
                                  {t('participant.community.private')}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(reply.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <ReplyForm
                      parentId={post._id}
                      onReply={handleReply}
                      placeholder={t('participant.community.reply')}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          {assignments.length === 0 ? (
            <DataState state="empty" title={t('participant.tasks.none')} />
          ) : (
            assignments.map((assignment) => {
              const submission = submitForm[assignment._id] || { content: '', file: null };
              return (
                <Card key={assignment._id} variant="interactive">
                  <CardHeader className="pb-3">
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
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleAssignmentSubmit(assignment._id);
                      }}
                      className="space-y-3"
                    >
                      <Textarea
                        value={submission.content}
                        onChange={(event) =>
                          setSubmitForm({
                            ...submitForm,
                            [assignment._id]: { ...submission, content: event.target.value },
                          })
                        }
                        placeholder={t('participant.workshop.askPlaceholder')}
                        required
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Input
                          type="file"
                          onChange={(event) =>
                            setSubmitForm({
                              ...submitForm,
                              [assignment._id]: {
                                ...submission,
                                file: event.target.files?.[0] || null,
                              },
                            })
                          }
                          className="sm:max-w-xs"
                        />
                        <Button type="submit" size="sm">
                          <Upload className="h-4 w-4" />
                          {t('participant.tasks.submit')}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* AI assistant */}
        {registered && (
          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Bot className="h-5 w-5 shrink-0 text-primary" />
                  {t('ai.assistant')}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {chatHistory.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {t('ai.empty')}
                    </p>
                  )}

                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm sm:max-w-[80%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
                        {t('ai.thinking')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={chatMsg}
                    onChange={(event) => setChatMsg(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleChat();
                      }
                    }}
                    placeholder={t('ai.askPlaceholder')}
                    className="h-11 min-w-0 flex-1"
                    aria-label={t('ai.askPlaceholder')}
                  />
                  <Button
                    onClick={handleChat}
                    disabled={chatLoading || !chatMsg.trim()}
                    className="h-11 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                    {t('ai.send')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Quiz */}
        {registered && (
          <TabsContent value="quiz">
            <QuizPanel workshopId={id ?? ''} />
          </TabsContent>
        )}

        {/* Leaderboard */}
        {registered && (
          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>
        )}

        {/* Feedback */}
        {registered && !feedbackSubmitted && (
          <TabsContent value="feedback">
            <FeedbackForm
              workshopId={id ?? ''}
              organizerId={typeof workshop.organizer === 'object' ? workshop.organizer._id : workshop.organizer}
              onSuccess={() => setFeedbackSubmitted(true)}
            />
          </TabsContent>
        )}
      </Tabs>

    </div>
  );
}

function ReplyForm({
  parentId,
  onReply,
  placeholder,
}: {
  parentId: string;
  onReply: (parentId: string, content: string, isPrivate: boolean) => void;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="mt-3"
      >
        <MessageSquare className="h-4 w-4" />
        {placeholder}
      </Button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (content.trim()) {
          onReply(parentId, content, isPrivate);
          setContent('');
          setIsPrivate(false);
          setOpen(false);
        }
      }}
      className="mt-3 space-y-2"
    >
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={placeholder}
        required
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
          />
          {t('participant.community.replyPrivate')}
        </label>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            {t('participant.community.reply')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </form>
  );
}

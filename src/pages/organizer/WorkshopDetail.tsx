import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRScanner } from '@/components/shared/QRScanner';
import { DataState } from '@/components/shared/DataState';
import { Leaderboard } from '@/components/shared/Leaderboard';
import { ParticipantSearch } from '@/components/shared/ParticipantSearch';
import { AIEvaluationModal } from '@/components/shared/AIEvaluationModal';
import {
  Plus, Users, FileText, MessageSquare, Megaphone, ClipboardList,
  Award, Camera, ArrowLeft, ExternalLink, Upload, CheckCircle2, XCircle,
  X, Bot, Trash2, Settings, Star, Link2,
} from 'lucide-react';
import type { Workshop, Session } from '@/types';

const emptySessionForm = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  googleMeetLink: '',
  attendanceMode: 'manual',
};

export default function WorkshopDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [failed, setFailed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [registrations, setRegistrations] = useState<
    Array<{ _id: string; user?: { name?: string; email?: string } }>
  >([]);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [scannerSessionId, setScannerSessionId] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ message: '', target: 'all' as 'online' | 'physical' | 'all' });
  const [csvSessionId, setCsvSessionId] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResults, setCsvResults] = useState<{ matched: number; unmatched: string[] } | null>(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [aiEvalOpen, setAiEvalOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState({
    alertIntervalMinutes: 5,
    maxAllowedMissedAlerts: 3,
  });
  const [feedbackSummary, setFeedbackSummary] = useState<{
    averageRating: number;
    totalCount: number;
    distribution: Record<number, number>;
  } | null>(null);
  const [resourceSessionId, setResourceSessionId] = useState<string | null>(null);
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'document' as 'slides' | 'code' | 'recording' | 'document' });
  const [announcements, setAnnouncements] = useState<Array<{ title: string; message: string; createdAt: string }>>([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api.get(`/workshops/${id}`).then((res) => {
      setWorkshop(res.data);
      if (res.data.attendanceSettings) {
        setAttendanceSettings(res.data.attendanceSettings);
      }
    }).catch(() => setFailed(true));
    api.get(`/sessions/workshop/${id}`).then((res) => setSessions(res.data)).catch(() => undefined);
    api
      .get(`/registrations/workshop/${id}`)
      .then((res) => setRegistrations(res.data))
      .catch(() => undefined);
    api
      .get(`/feedback/workshops/${id}/feedback/summary`)
      .then((res) => setFeedbackSummary(res.data))
      .catch(() => undefined);
    api
      .get(`/workshops/${id}/announcements`)
      .then((res) => setAnnouncements(res.data))
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddSession = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.post(`/sessions/workshop/${id}`, {
      ...sessionForm,
      startTime: `${sessionForm.date}T${sessionForm.startTime}`,
      endTime: `${sessionForm.date}T${sessionForm.endTime}`,
      date: sessionForm.date,
    });
    setSessionDialog(false);
    setSessionForm(emptySessionForm);
    load();
  };

  const handleBroadcast = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await api.post(`/workshops/${id}/broadcast`, broadcastForm);
    setBroadcastOpen(false);
    setBroadcastForm({ message: '', target: 'all' });
    alert(t('broadcast.sent', { count: res.data.sent }));
  };

  const handleCsvImport = async (sessionId: string) => {
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await api.post(`/attendance/session/${sessionId}/csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvResults({ matched: res.data.matched, unmatched: res.data.unmatched });
      setCsvFile(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    }
  };

  const handleCancelWorkshop = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await api.post(`/workshops/${id}/cancel`, { reason: cancelReason });
      setCancelDialog(false);
      setCancelReason('');
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;
    setDeleting(true);
    try {
      await api.delete(`/sessions/${deleteSessionId}`);
      setDeleteSessionId(null);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveAttendanceSettings = async () => {
    try {
      await api.put(`/workshops/${id}`, { attendanceSettings });
      setSettingsOpen(false);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    }
  };

  const handleAddResource = async (sessionId: string) => {
    if (!newResource.title || !newResource.url) return;
    const session = sessions.find((s) => s._id === sessionId);
    if (!session) return;
    const updatedResources = [...(session.resources || []), newResource];
    try {
      await api.put(`/sessions/${sessionId}`, { resources: updatedResources });
      setNewResource({ title: '', url: '', type: 'document' });
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    }
  };

  const handleRemoveResource = async (sessionId: string, index: number) => {
    const session = sessions.find((s) => s._id === sessionId);
    if (!session) return;
    const updatedResources = [...(session.resources || [])];
    updatedResources.splice(index, 1);
    try {
      await api.put(`/sessions/${sessionId}`, { resources: updatedResources });
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    }
  };

  const handlePostAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!announcementForm.title || !announcementForm.message) return;
    setPostingAnnouncement(true);
    try {
      await api.post(`/workshops/${id}/announcements`, announcementForm);
      setAnnouncementForm({ title: '', message: '' });
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || t('common.error'));
    } finally {
      setPostingAnnouncement(false);
    }
  };

  if (failed) {
    return (
      <DataState
        state="error"
        title={t('organizer.workshop.notFound')}
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

  const tabLinks = [
    { value: 'resources', label: t('organizer.workshop.resources'), to: 'resources', icon: FileText },
    { value: 'assignments', label: t('organizer.workshop.tasks'), to: 'assignments', icon: ClipboardList },
    { value: 'announcements', label: t('announcements.title'), to: '', icon: Megaphone },
    { value: 'community', label: t('organizer.workshop.community'), to: 'community', icon: MessageSquare },
    { value: 'certificates', label: t('organizer.workshop.certs'), to: 'certificates', icon: Award },
    { value: 'leaderboard', label: t('leaderboard.title'), to: '', icon: Award },
    { value: 'feedback', label: t('feedback.title'), to: '', icon: Star },
  ];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/organizer/workshops">
          <ArrowLeft className="h-4 w-4" />
          {t('organizer.workshop.back')}
        </Link>
      </Button>

      <header className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold sm:text-3xl">{workshop.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  workshop.status === 'published'
                    ? 'success-soft'
                    : workshop.status === 'draft'
                      ? 'warning-soft'
                      : workshop.status === 'cancelled'
                        ? 'destructive'
                        : 'outline'
                }
              >
                {t(`workshop.status.${workshop.status}`, { defaultValue: workshop.status })}
              </Badge>
              {workshop.topics?.map((topic) => (
                <Badge key={topic} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {workshop.description}
            </p>
          </div>
          {workshop.status !== 'cancelled' && (
            <Button variant="destructive" size="sm" onClick={() => setCancelDialog(true)}>
              <X className="h-4 w-4" />
              Cancel Workshop
            </Button>
          )}
        </div>
      </header>

      {/* Cancel Workshop Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Workshop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will cancel the workshop and notify all registered participants. This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling this workshop?"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleCancelWorkshop}
                disabled={cancelling}
                className="flex-1"
              >
                {cancelling ? t('common.loading') : 'Cancel Workshop'}
              </Button>
              <Button variant="outline" onClick={() => setCancelDialog(false)} className="flex-1">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Session Dialog */}
      <Dialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('session.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('session.deleteWarning')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDeleteSession}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? t('common.loading') : t('common.delete')}
              </Button>
              <Button variant="outline" onClick={() => setDeleteSessionId(null)} className="flex-1">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendance Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('attendanceSettings.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('attendanceSettings.alertInterval')}</Label>
              <Input
                type="number"
                min={1}
                value={attendanceSettings.alertIntervalMinutes}
                onChange={(e) => setAttendanceSettings({
                  ...attendanceSettings,
                  alertIntervalMinutes: Number(e.target.value) || 5,
                })}
              />
              <p className="text-xs text-muted-foreground">
                {t('attendanceSettings.alertIntervalHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('attendanceSettings.maxMissed')}</Label>
              <Input
                type="number"
                min={0}
                value={attendanceSettings.maxAllowedMissedAlerts}
                onChange={(e) => setAttendanceSettings({
                  ...attendanceSettings,
                  maxAllowedMissedAlerts: Number(e.target.value) || 0,
                })}
              />
              <p className="text-xs text-muted-foreground">
                {t('attendanceSettings.maxMissedHint')}
              </p>
            </div>
            <Button onClick={handleSaveAttendanceSettings} className="w-full">
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="sessions">
        {/* Six tabs never fit a phone, so the strip scrolls horizontally instead
            of crushing each label into a sliver. */}
        <div className="kv-scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="flex h-auto w-max justify-start gap-1 bg-muted p-1">
            <TabsTrigger value="sessions" className="shrink-0 gap-1.5">
              <Users className="h-4 w-4" />
              {t('organizer.workshop.sessions')}
            </TabsTrigger>
            <TabsTrigger value="roster" className="shrink-0 gap-1.5">
              <Users className="h-4 w-4" />
              {t('organizer.workshop.roster')}
            </TabsTrigger>
            {tabLinks.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 gap-1.5">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Sessions */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold sm:text-xl">
              {t('organizer.workshop.sessions')}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
                {t('attendanceSettings.title')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAiEvalOpen(true)}>
                <Bot className="h-4 w-4" />
                AI Evaluation
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)}>
                <Megaphone className="h-4 w-4" />
                {t('broadcast.title')}
              </Button>
              <Button size="sm" onClick={() => setSessionDialog(!sessionDialog)}>
                <Plus className="h-4 w-4" />
                {t('organizer.workshop.add')}
              </Button>
            </div>
          </div>

          {/* AI Evaluation Modal */}
          <AIEvaluationModal workshopId={id ?? ''} open={aiEvalOpen} onOpenChange={setAiEvalOpen} />

          {/* Broadcast Modal */}
          <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('broadcast.title')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBroadcast} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('broadcast.message')}</Label>
                  <Textarea
                    value={broadcastForm.message}
                    onChange={(event) => setBroadcastForm({ ...broadcastForm, message: event.target.value })}
                    placeholder={t('broadcast.subtitle')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('broadcast.target')}</Label>
                  <Select
                    value={broadcastForm.target}
                    onValueChange={(value) =>
                      setBroadcastForm({ ...broadcastForm, target: value as 'online' | 'physical' | 'all' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('organizer.resources.targetAll')}</SelectItem>
                      <SelectItem value="online">{t('organizer.resources.targetOnline')}</SelectItem>
                      <SelectItem value="physical">{t('organizer.resources.targetPhysical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  <Megaphone className="h-4 w-4" />
                  {t('broadcast.send')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {sessionDialog && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  {t('organizer.workshop.addSession')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddSession} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="s-title">{t('organizer.workshop.sessionTitle')}</Label>
                      <Input
                        id="s-title"
                        value={sessionForm.title}
                        onChange={(event) =>
                          setSessionForm({ ...sessionForm, title: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-date">{t('organizer.workshop.date')}</Label>
                      <Input
                        id="s-date"
                        type="date"
                        value={sessionForm.date}
                        onChange={(event) =>
                          setSessionForm({ ...sessionForm, date: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-start">{t('organizer.workshop.start')}</Label>
                      <Input
                        id="s-start"
                        type="time"
                        value={sessionForm.startTime}
                        onChange={(event) =>
                          setSessionForm({ ...sessionForm, startTime: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-end">{t('organizer.workshop.end')}</Label>
                      <Input
                        id="s-end"
                        type="time"
                        value={sessionForm.endTime}
                        onChange={(event) =>
                          setSessionForm({ ...sessionForm, endTime: event.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-meet">{t('organizer.workshop.meetLink')}</Label>
                    <Input
                      id="s-meet"
                      value={sessionForm.googleMeetLink}
                      onChange={(event) =>
                        setSessionForm({ ...sessionForm, googleMeetLink: event.target.value })
                      }
                      placeholder="https://meet.google.com/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('organizer.workshop.attendanceMode')}</Label>
                    <Select
                      value={sessionForm.attendanceMode}
                      onValueChange={(value) =>
                        setSessionForm({ ...sessionForm, attendanceMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">{t('organizer.workshop.manual')}</SelectItem>
                        <SelectItem value="qr">{t('organizer.workshop.qr')}</SelectItem>
                        <SelectItem value="csv">{t('organizer.workshop.csv')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full sm:w-auto">
                    {t('organizer.workshop.addSession')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {sessions.length === 0 && !sessionDialog && (
            <DataState
              state="empty"
              title={t('organizer.workshop.noSessions')}
              description={t('workshop.sessions')}
            />
          )}

          {sessions.map((session) => (
            <Card key={session._id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <h3 className="font-semibold">{session.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString()} · {session.attendanceMode}
                  </p>
                  {session.googleMeetLink && (
                    <a
                      href={session.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('organizer.workshop.joinMeet')}
                    </a>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {t(`organizer.workshop.${session.attendanceMode}`, {
                      defaultValue: session.attendanceMode,
                    })}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setScannerSessionId(scannerSessionId === session._id ? null : session._id)
                    }
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {scannerSessionId === session._id
                      ? t('common.close')
                      : t('organizer.workshop.scanQr')}
                  </Button>
                  {(workshop.mode === 'online' || workshop.mode === 'hybrid') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCsvSessionId(csvSessionId === session._id ? null : session._id)
                      }
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {csvSessionId === session._id
                        ? t('common.close')
                        : t('csv.import')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteSessionId(session._id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>

              {scannerSessionId === session._id && (
                <div className="border-t border-border/60 p-4 sm:p-6">
                  <QRScanner sessionId={session._id} onScanSuccess={() => load()} />
                </div>
              )}

              {(workshop.mode === 'online' || workshop.mode === 'hybrid') && csvSessionId === session._id && (
                <div className="border-t border-border/60 p-4 sm:p-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">{t('csv.import')}</h3>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
                        className="sm:max-w-xs"
                      />
                      <Button
                        onClick={() => handleCsvImport(session._id)}
                        disabled={!csvFile}
                        size="sm"
                      >
                        <Upload className="h-4 w-4" />
                        {t('csv.import')}
                      </Button>
                    </div>

                    {csvResults && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="mb-2 font-medium">{t('csv.results')}</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              <span>{t('csv.matched', { count: csvResults.matched })}</span>
                            </div>
                            {csvResults.unmatched.length > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <XCircle className="h-4 w-4 text-destructive" />
                                  <span>{t('csv.unmatched', { count: csvResults.unmatched.length })}</span>
                                </div>
                                <ul className="ml-6 list-disc text-xs text-muted-foreground">
                                  {csvResults.unmatched.map((email, idx) => (
                                    <li key={idx}>{email}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Session Resources */}
              <div className="border-t border-border/60 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <Link2 className="h-4 w-4 text-primary" />
                    {t('session.resources')}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResourceSessionId(resourceSessionId === session._id ? null : session._id)}
                  >
                    {resourceSessionId === session._id ? t('common.close') : t('common.edit')}
                  </Button>
                </div>

                {session.resources && session.resources.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {session.resources.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 rounded bg-secondary/50 px-3 py-1.5 text-sm">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:underline">
                          {r.title}
                        </a>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">{r.type}</Badge>
                          <button
                            onClick={() => handleRemoveResource(session._id, idx)}
                            className="text-destructive hover:text-destructive/80"
                            aria-label="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {resourceSessionId === session._id && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder={t('session.resourceTitle')}
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      className="sm:flex-1"
                    />
                    <Input
                      placeholder="https://..."
                      value={newResource.url}
                      onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                      className="sm:flex-1"
                    />
                    <Select
                      value={newResource.type}
                      onValueChange={(v) => setNewResource({ ...newResource, type: v as typeof newResource.type })}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="slides">Slides</SelectItem>
                        <SelectItem value="code">Code</SelectItem>
                        <SelectItem value="recording">Recording</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => handleAddResource(session._id)} disabled={!newResource.title || !newResource.url}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Roster */}
        <TabsContent value="roster" className="space-y-3">
          <h2 className="text-lg font-semibold sm:text-xl">
            {t('organizer.workshop.registeredParticipants', { count: registrations.length })}
          </h2>

          {registrations.length === 0 && (
            <DataState state="empty" title={t('organizer.workshop.noParticipants')} />
          )}

          {registrations.length > 0 && (
            <ParticipantSearch participants={registrations} />
          )}
        </TabsContent>

        {/* Linked management screens */}
        {tabLinks.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.value === 'leaderboard' ? (
              <Leaderboard />
            ) : tab.value === 'announcements' ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Megaphone className="h-5 w-5 text-primary" />
                      {t('announcements.post')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePostAnnouncement} className="space-y-3">
                      <div className="space-y-2">
                        <Label>{t('common.title', { defaultValue: 'Title' })}</Label>
                        <Input
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                          placeholder={t('announcements.titlePlaceholder', { defaultValue: 'Announcement title' })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('common.message', { defaultValue: 'Message' })}</Label>
                        <Textarea
                          value={announcementForm.message}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                          placeholder={t('announcements.messagePlaceholder', { defaultValue: 'Write your announcement...' })}
                          rows={3}
                          required
                        />
                      </div>
                      <Button type="submit" disabled={postingAnnouncement}>
                        <Megaphone className="h-4 w-4" />
                        {postingAnnouncement ? t('common.loading') : t('announcements.post')}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {announcements.length === 0 ? (
                  <DataState state="empty" title={t('announcements.empty')} />
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">{t('announcements.history', { defaultValue: 'Previous Announcements' })}</h3>
                    {announcements.map((ann, idx) => (
                      <Card key={idx}>
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold">{ann.title}</h4>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {new Date(ann.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{ann.message}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : tab.value === 'feedback' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Star className="h-5 w-5 text-primary" />
                    {t('feedback.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {feedbackSummary && feedbackSummary.totalCount > 0 ? (
                    <>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-primary">{feedbackSummary.averageRating}</p>
                          <div className="mt-1 flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-4 w-4 ${s <= Math.round(feedbackSummary.averageRating) ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('feedback.ratings')}: {feedbackSummary.totalCount}
                          </p>
                        </div>
                        <div className="flex-1 space-y-2">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const count = feedbackSummary.distribution[stars] || 0;
                            const pct = feedbackSummary.totalCount > 0
                              ? Math.round((count / feedbackSummary.totalCount) * 100)
                              : 0;
                            return (
                              <div key={stars} className="flex items-center gap-2">
                                <span className="w-6 text-right text-xs font-medium">{stars}</span>
                                <Star className="h-3 w-3 fill-primary text-primary" />
                                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right text-xs text-muted-foreground">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <DataState state="empty" title={t('feedback.noFeedback')} />
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <tab.icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium">{tab.label}</span>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/organizer/workshops/${id}/${tab.to}`}>
                      {tab.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

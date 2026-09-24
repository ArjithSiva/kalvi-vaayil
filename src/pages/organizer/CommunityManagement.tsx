import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataState, DataStateSkeleton } from '@/components/shared/DataState';
import { ArrowLeft, Lock, MessageSquare, Plus, Reply, Trash2 } from 'lucide-react';

interface Post {
  _id: string;
  content: string;
  isPrivate: boolean;
  author: { _id: string; name: string };
  createdAt: string;
  replies: Post[];
}

export default function CommunityManagement() {
  const { id: workshopId } = useParams();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [replyForm, setReplyForm] = useState({ content: '', isPrivate: false });

  const load = useCallback(() => {
    setState('loading');
    api
      .get(`/community/workshop/${workshopId}`)
      .then((res) => {
        setPosts(res.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!replyTo) return;

    await api.post(`/community/workshop/${workshopId}`, {
      content: replyForm.content,
      isPrivate: replyForm.isPrivate,
      parentPost: replyTo._id,
    });

    setReplyTo(null);
    setReplyForm({ content: '', isPrivate: false });
    load();
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm(t('common.confirm'))) return;
    await api.delete(`/community/${postId}`);
    load();
  };

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <Button asChild variant="ghost" size="sm" className="mb-2 w-fit">
          <Link to={`/organizer/workshops/${workshopId}`}>
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('organizer.community.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t('organizer.community.subtitle')}
        </p>
      </header>

      {state === 'loading' && <DataStateSkeleton count={3} />}

      {state === 'error' && (
        <DataState
          state="error"
          title={t('organizer.community.error')}
          description={t('error.description')}
          actionLabel={t('common.retry')}
          onAction={load}
        />
      )}

      {state === 'ready' && posts.length === 0 && (
        <DataState state="empty" title={t('organizer.community.none')} />
      )}

      {state === 'ready' && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(post._id)}
                    aria-label={t('organizer.community.delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm">{post.content}</p>
              </CardHeader>

              <CardContent className="space-y-3">
                {post.replies.length > 0 && (
                  <div className="space-y-2 border-l-2 border-border pl-4">
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

                {replyTo?._id === post._id ? (
                  <form onSubmit={handleReply} className="space-y-3">
                    <Textarea
                      value={replyForm.content}
                      onChange={(event) =>
                        setReplyForm({ ...replyForm, content: event.target.value })
                      }
                      placeholder={t('organizer.community.reply')}
                      required
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={replyForm.isPrivate}
                          onChange={(event) =>
                            setReplyForm({ ...replyForm, isPrivate: event.target.checked })
                          }
                        />
                        {t('organizer.community.replyPrivate')}
                      </label>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">
                          <Reply className="h-4 w-4" />
                          {t('organizer.community.reply')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyTo(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReplyTo(post)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t('organizer.community.reply')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

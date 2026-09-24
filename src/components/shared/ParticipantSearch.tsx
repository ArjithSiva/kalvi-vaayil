import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Users } from 'lucide-react';

interface Participant {
  _id: string;
  user?: {
    name?: string;
    email?: string;
  };
}

interface ParticipantSearchProps {
  participants: Participant[];
  onSelect?: (participant: Participant) => void;
}

export function ParticipantSearch({ participants, onSelect }: ParticipantSearchProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = participants.filter((p) => {
    const name = p.user?.name?.toLowerCase() || '';
    const email = p.user?.email?.toLowerCase() || '';
    const query = search.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="pl-10"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No participants found</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {filtered.length} participant{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filtered.map((participant) => (
                <button
                  key={participant._id}
                  onClick={() => onSelect?.(participant)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card p-3 text-left transition-colors hover:bg-secondary/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {participant.user?.name?.[0] || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{participant.user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {participant.user?.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

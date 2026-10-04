import { useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { askAssistant } from '@/services/ai';

export function AiAssistant({ context }: { context?: string }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ text: string | null; error: string | null } | null>(null);
  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setRes(await askAssistant('tutor', `${context ? `Contexte : ${context}\n\n` : ''}${q.trim()}`.slice(0, 4000)));
    setBusy(false);
  };
  return (
    <div className="card mt-4 p-5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Bot className="h-4 w-4 text-primary-500" />Assistant pédagogique</h3>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} maxLength={1000} aria-label="Question à l'assistant" placeholder="Pose une question sur cette leçon…" className="input-field" />
      <div className="mt-2 flex items-center gap-3"><Button size="sm" variant="outline" disabled={busy} onClick={() => void ask()}>{busy ? '…' : 'Demander'}</Button>
        {res?.error && <span role="status" className="text-xs text-neutral-500">{res.error}</span>}</div>
      {res?.text && <p className="mt-3 whitespace-pre-wrap text-sm">{res.text}</p>}
    </div>
  );
}

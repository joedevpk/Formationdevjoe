import { Fragment, type ReactNode } from 'react';

// Rendu Markdown minimal et SÛR (aucun HTML brut injecté) : titres ###, listes -, blocs de code ```, `code`, **gras**, liens http(s).
function inline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g);
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={i} className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-800">{p.slice(1, -1)}</code>;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">{p}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function RichText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(<pre key={k++}><code>{buf.join('\n')}</code></pre>);
    } else if (line.startsWith('### ')) {
      out.push(<h3 key={k++}>{inline(line.slice(4))}</h3>);
      i++;
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2));
      out.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>);
    } else if (line.trim() === '') {
      i++;
    } else {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('```') && !lines[i].startsWith('### ') && !lines[i].startsWith('- ')) buf.push(lines[i++]);
      out.push(<p key={k++}>{inline(buf.join(' '))}</p>);
    }
  }
  return <div className="prose-lesson">{out}</div>;
}

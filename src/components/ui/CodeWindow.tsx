import { type ReactNode } from 'react';

export function CodeWindow({ title = 'terminal', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-glow">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" /><span className="h-2.5 w-2.5 rounded-full bg-neutral-700" /><span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
        <span className="ml-2 font-mono text-xs text-neutral-500">{title}</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-neutral-300">{children}</pre>
    </div>
  );
}

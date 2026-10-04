import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { safeHref } from '@/lib/cv/format';

export type Rec = Record<string, unknown> & { id: string; position: number; is_visible: boolean };

export interface Field {
  name: string; label: string;
  type: 'text' | 'textarea' | 'month' | 'year' | 'url' | 'list' | 'checkbox' | 'select';
  required?: boolean; nullable?: boolean; half?: boolean; options?: string[]; help?: string; suggestions?: string[]; placeholder?: string;
}

interface Props {
  table: string;
  title: string;
  noun: string;
  items: Rec[];
  fields: Field[];
  summary: (r: Rec) => { title: string; sub?: string };
  defaults: Record<string, unknown>;
  emptyText: string;
  onChanged: () => Promise<unknown>;
}

// ── conversions formulaire ↔ base ──
const toForm = (f: Field, v: unknown): unknown => {
  if (f.type === 'month') return typeof v === 'string' ? v.slice(0, 7) : '';
  if (f.type === 'list') return Array.isArray(v) ? v.join('\n') : '';
  if (f.type === 'year') return v == null ? '' : String(v);
  if (f.type === 'checkbox') return Boolean(v);
  return v ?? '';
};
const fromForm = (f: Field, v: unknown): unknown => {
  const s = typeof v === 'string' ? v.trim() : v;
  if (f.type === 'month') return s ? `${s}-01` : null;
  if (f.type === 'list') return String(s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (f.type === 'year') return s ? Number(s) : null;
  if (f.type === 'checkbox') return Boolean(s);
  if (f.type === 'url') return s || null;
  if (f.nullable && s === '') return null;
  return s;
};

const cls = 'input-field';

export function ListEditor({ table, title, noun, items, fields, summary, defaults, emptyText, onChanged }: Props) {
  const toast = useToast();
  const [editing, setEditing] = useState<{ id: string | null; vals: Record<string, unknown> } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const open = (r?: Rec) => {
    setErrors({});
    const vals: Record<string, unknown> = {};
    for (const f of fields) vals[f.name] = toForm(f, r ? r[f.name] : defaults[f.name]);
    setEditing({ id: r?.id ?? null, vals });
  };

  const run = async (fn: () => PromiseLike<{ error: unknown }>, fail = 'Action impossible. Réessaie dans un instant.') => {
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) throw error;
      await onChanged();
      return true;
    } catch {
      toast('error', fail);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const errs: Record<string, string> = {};
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = editing.vals[f.name];
      if (f.required && !String(raw ?? '').trim()) errs[f.name] = 'Champ requis.';
      if (f.type === 'url' && String(raw ?? '').trim() && !safeHref(String(raw))) errs[f.name] = 'Lien invalide (doit commencer par https://).';
      if (f.type === 'year' && String(raw ?? '').trim() && !/^\d{4}$/.test(String(raw).trim())) errs[f.name] = 'Année sur 4 chiffres.';
      payload[f.name] = fromForm(f, raw);
    }
    if (payload.is_current) payload.end_date = null;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ok = editing.id
      ? await run(() => supabase.from(table).update(payload).eq('id', editing.id as string))
      : await run(() => supabase.from(table).insert({ ...payload, position: items.reduce((m, i) => Math.max(m, i.position), -1) + 1, is_visible: true }));
    if (ok) { setEditing(null); toast('success', editing.id ? 'Modifié.' : 'Ajouté.'); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const order = items.map((i) => i.id);
    [order[idx], order[j]] = [order[j], order[idx]];
    await run(async () => {
      const results = await Promise.all(order.map((id, pos) => supabase.from(table).update({ position: pos }).eq('id', id)));
      return { error: results.find((r) => r.error)?.error ?? null };
    });
  };

  const set = (name: string, v: unknown) => setEditing((p) => (p ? { ...p, vals: { ...p.vals, [name]: v } } : p));
  const isCurrent = Boolean(editing?.vals.is_current);

  return (
    <section aria-labelledby={`h-${table}`} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`h-${table}`} className="text-lg font-bold">{title}</h2>
        {!editing && <Button size="sm" onClick={() => open()}><Plus className="h-4 w-4" aria-hidden="true" />Ajouter {noun}</Button>}
      </div>

      {items.length === 0 && !editing && <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500 dark:border-neutral-700">{emptyText}</p>}

      <ul className="space-y-2">
        {items.map((r, idx) => {
          const s = summary(r);
          return (
            <li key={r.id} className="card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold ${r.is_visible ? '' : 'text-neutral-400 line-through'}`}>{s.title}</p>
                {s.sub && <p className="truncate text-xs text-neutral-500">{s.sub}</p>}
              </div>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={r.is_visible} disabled={busy} aria-label={`Visible dans le CV : ${s.title}`}
                  onChange={(e) => void run(() => supabase.from(table).update({ is_visible: e.target.checked }).eq('id', r.id))} />
                Dans le CV
              </label>
              <div className="flex items-center">
                <button type="button" disabled={busy || idx === 0} onClick={() => void move(idx, -1)} aria-label={`Monter ${s.title}`} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" disabled={busy || idx === items.length - 1} onClick={() => void move(idx, 1)} aria-label={`Descendre ${s.title}`} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" onClick={() => open(r)} aria-label={`Modifier ${s.title}`} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" disabled={busy} aria-label={`Supprimer ${s.title}`} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-error-600 dark:hover:bg-neutral-800"
                  onClick={() => { if (window.confirm(`Supprimer « ${s.title} » ?`)) void run(() => supabase.from(table).delete().eq('id', r.id)); }}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <form onSubmit={(e) => void save(e)} className="card space-y-4 border-primary-500/40 p-5" noValidate aria-label={editing.id ? `Modifier ${noun}` : `Ajouter ${noun}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const id = `${table}-${f.name}`;
              const v = editing.vals[f.name];
              const wide = !f.half && f.type !== 'checkbox';
              const disabled = f.name === 'end_date' && isCurrent;
              return (
                <div key={f.name} className={wide || f.type === 'textarea' || f.type === 'list' ? 'sm:col-span-2' : ''}>
                  {f.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} />{f.label}</label>
                  ) : (
                    <>
                      <label htmlFor={id} className="label">{f.label}{f.required ? '' : <span className="font-normal text-neutral-500"> (facultatif)</span>}</label>
                      {f.type === 'textarea' || f.type === 'list' ? (
                        <textarea id={id} rows={f.type === 'list' ? 3 : 4} className={cls} value={String(v ?? '')} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
                      ) : f.type === 'select' ? (
                        <select id={id} className={cls} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)}><option value="">—</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
                      ) : (
                        <input id={id} className={cls} disabled={disabled} list={f.suggestions ? `${id}-list` : undefined} placeholder={f.placeholder}
                          type={f.type === 'month' ? 'month' : f.type === 'url' ? 'url' : 'text'} inputMode={f.type === 'year' ? 'numeric' : undefined}
                          aria-invalid={Boolean(errors[f.name])} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />
                      )}
                      {f.suggestions && <datalist id={`${id}-list`}>{f.suggestions.map((o) => <option key={o} value={o} />)}</datalist>}
                      {f.help && <p className="mt-1 text-xs text-neutral-500">{f.help}</p>}
                      {errors[f.name] && <p role="alert" className="mt-1 text-xs text-error-600 dark:text-error-400">{errors[f.name]}</p>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button><Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button></div>
        </form>
      )}
    </section>
  );
}

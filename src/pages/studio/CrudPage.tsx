import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { QueryState } from '@/components/ui/QueryState';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import { slugify, splitList, safeUrl } from '@/utils';

export type Row = Record<string, unknown> & { id: string };
type Opt = string | { value: string; label: string };

export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'list' | 'date' | 'datetime' | 'url' | 'image' | 'relation';
  required?: boolean;
  options?: Opt[];
  help?: string;
  bucket?: string; // pour type image
  relation?: { table: string; label: string; filter?: { column: string; value: string } };
  half?: boolean;
  unique?: boolean;
}

export interface Column { key: string; label: string; render?: (row: Row) => ReactNode }

export interface CrudConfig {
  table: string;
  title: string;
  singular: string;
  description?: string;
  select?: string;
  fields: FieldDef[];
  columns: Column[];
  orderBy?: { column: string; ascending?: boolean };
  searchKeys: string[];
  defaults: Record<string, unknown>;
  slugFrom?: string; // génère automatiquement slug depuis ce champ
  toForm?: (row: Row) => Record<string, unknown>;
  stripOnSave?: string[];
  beforeSave?: (values: Record<string, unknown>) => Promise<Record<string, unknown>>;
  afterSave?: (id: string, values: Record<string, unknown>) => Promise<void>;
}

const PAGE = 10;

const optLabel = (o: Opt) => (typeof o === 'string' ? o : o.label);
const optValue = (o: Opt) => (typeof o === 'string' ? o : o.value);

function toInput(type: FieldDef['type'], v: unknown): string {
  if (v == null) return '';
  if (type === 'list') return Array.isArray(v) ? (v as string[]).join('\n') : '';
  if (type === 'datetime') { const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  if (type === 'date') return String(v).slice(0, 10);
  return String(v);
}

function RelationSelect({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const rel = field.relation as NonNullable<FieldDef['relation']>;
  const q = useQuery({
    queryKey: ['rel', rel.table, rel.label],
    queryFn: async () => {
      const { data, error } = await supabase.from(rel.table).select(`id, ${rel.label}`).order(rel.label);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Record<string, string>[];
    },
  });
  return (
    <select id={field.name} className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{q.isLoading ? 'Chargement…' : '— Choisir —'}</option>
      {(q.data ?? []).map((r) => <option key={r.id} value={r.id}>{r[rel.label]}</option>)}
    </select>
  );
}

export default function CrudPage({ config }: { config: CrudConfig }) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = ['studio', config.table];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Row[]> => {
      let q = supabase.from(config.table).select(config.select ?? '*');
      if (config.orderBy) q = q.order(config.orderBy.column, { ascending: config.orderBy.ascending ?? false });
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (query.data ?? []).filter((r) => !s || config.searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(s)));
  }, [query.data, search, config.searchKeys]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const visible = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const openEditor = (row: Row | 'new') => {
    const base = row === 'new' ? config.defaults : (config.toForm ? config.toForm(row) : row);
    const f: Record<string, string | boolean> = {};
    for (const fd of config.fields) {
      const v = base[fd.name];
      f[fd.name] = fd.type === 'checkbox' ? Boolean(v) : toInput(fd.type, v);
    }
    setForm(f); setErrors({}); setEditing(row);
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    for (const fd of config.fields) {
      const v = form[fd.name];
      if (fd.required && (v === '' || v === undefined)) e[fd.name] = 'Champ requis';
      if (fd.type === 'number' && v !== '' && Number.isNaN(Number(v))) e[fd.name] = 'Nombre invalide';
      if ((fd.type === 'url' || fd.type === 'image') && v && !safeUrl(String(v))) e[fd.name] = 'URL http(s) invalide';
      if (fd.name === 'slug' && v && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(v))) e[fd.name] = 'Slug invalide (minuscules, chiffres, tirets)';
    }
    return e;
  };

  const save = useMutation({
    mutationFn: async () => {
      let values: Record<string, unknown> = {};
      for (const fd of config.fields) {
        const v = form[fd.name];
        if (fd.type === 'checkbox') values[fd.name] = Boolean(v);
        else if (fd.type === 'number') values[fd.name] = v === '' ? null : Number(v);
        else if (fd.type === 'list') values[fd.name] = splitList(String(v ?? ''));
        else if (fd.type === 'datetime') values[fd.name] = v ? new Date(String(v)).toISOString() : null;
        else values[fd.name] = v === '' ? null : v;
      }
      if (config.slugFrom && !values.slug) values.slug = slugify(String(values[config.slugFrom] ?? ''));
      if (config.beforeSave) values = await config.beforeSave(values);
      const persisted = { ...values };
      for (const k of config.stripOnSave ?? []) delete persisted[k];
      if (editing === 'new' || editing === null) {
        const { data, error } = await supabase.from(config.table).insert(persisted).select('id').single();
        if (error) throw new Error(error.message);
        if (config.afterSave) await config.afterSave((data as { id: string }).id, values);
      } else {
        const { error } = await supabase.from(config.table).update(persisted).eq('id', editing.id);
        if (error) throw new Error(error.message);
        if (config.afterSave) await config.afterSave(editing.id, values);
      }
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: key }); await qc.invalidateQueries({ queryKey: ['studio-counts'] }); toast('success', 'Enregistré.'); setEditing(null); },
    onError: (e: Error) => toast('error', /duplicate key/i.test(e.message) ? 'Cette valeur existe déjà (slug ou titre en double).' : e.message),
  });

  const del = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from(config.table).delete().eq('id', row.id);
      if (error) throw new Error(error.message);
    },
    // Optimistic UI : la ligne disparaît tout de suite, restaurée si la suppression échoue.
    onMutate: async (row) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Row[]>(key);
      qc.setQueryData<Row[]>(key, (old) => (old ?? []).filter((r) => r.id !== row.id));
      setToDelete(null);
      return { prev };
    },
    onError: (e: Error, _row, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast('error', e.message); },
    onSuccess: () => { toast('success', 'Supprimé.'); void qc.invalidateQueries({ queryKey: ['studio-counts'] }); },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) save.mutate();
  };

  const upload = async (fd: FieldDef, file: File | undefined) => {
    if (!file || !fd.bucket) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { toast('error', 'Image requise, 5 Mo maximum.'); return; }
    setUploading(fd.name);
    const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${file.name.split('.').pop() ?? 'png'}`;
    const { error } = await supabase.storage.from(fd.bucket).upload(path, file);
    setUploading(null);
    if (error) { toast('error', "Téléversement impossible : " + error.message); return; }
    setForm((f) => ({ ...f, [fd.name]: supabase.storage.from(fd.bucket as string).getPublicUrl(path).data.publicUrl }));
  };

  return (
    <div className="space-y-6">
      <Seo title={`Studio — ${config.title}`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold">{config.title}</h1>{config.description && <p className="mt-1 text-sm text-neutral-500">{config.description}</p>}</div>
        <Button onClick={() => openEditor('new')}><Plus className="h-4 w-4" />Nouveau</Button>
      </div>

      <div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} aria-label="Rechercher" placeholder="Rechercher…" className="input-field pl-10" /></div>

      <QueryState query={{ ...query, data: query.data && filtered.length === 0 && search ? [] : query.data }} isEmpty={(d) => d.length === 0}
        emptyTitle={search ? 'Aucun résultat' : `Aucun élément dans « ${config.title} »`} emptyText={search ? 'Modifie ta recherche.' : `Crée ${config.singular} avec le bouton « Nouveau ».`}>
        {() => (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                  {config.columns.map((c) => <th key={c.key} className="px-4 py-3 font-semibold">{c.label}</th>)}<th className="px-4 py-3" />
                </tr></thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                      {config.columns.map((c) => <td key={c.key} className="max-w-[20rem] truncate px-4 py-3">{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>)}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button onClick={() => openEditor(r)} aria-label="Modifier" className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setToDelete(r)} aria-label="Supprimer" className="rounded-lg p-2 text-error-500 hover:bg-error-500/10"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && <div className="flex items-center justify-between text-sm"><span className="text-neutral-500">Page {page + 1} / {pages} • {filtered.length} éléments</span>
              <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédent</Button><Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Suivant</Button></div></div>}
          </>
        )}
      </QueryState>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? `Nouveau — ${config.singular}` : `Modifier — ${config.singular}`} wide>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {config.fields.map((fd) => (
            <div key={fd.name} className={fd.half ? '' : 'sm:col-span-2'}>
              {fd.type !== 'checkbox' && <label htmlFor={fd.name} className="label">{fd.label}{fd.required && ' *'}</label>}
              {fd.type === 'textarea' || fd.type === 'list' ? <textarea id={fd.name} rows={fd.type === 'list' ? 4 : 5} className="input-field resize-y" value={String(form[fd.name] ?? '')} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                : fd.type === 'select' ? <select id={fd.name} className="input-field" value={String(form[fd.name] ?? '')} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })}>{(fd.options ?? []).map((o) => <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}</select>
                : fd.type === 'relation' ? <RelationSelect field={fd} value={String(form[fd.name] ?? '')} onChange={(v) => setForm({ ...form, [fd.name]: v })} />
                : fd.type === 'checkbox' ? <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={Boolean(form[fd.name])} onChange={(e) => setForm({ ...form, [fd.name]: e.target.checked })} className="h-4 w-4 rounded" />{fd.label}</label>
                : fd.type === 'image' ? (
                  <div className="flex gap-2"><input id={fd.name} className="input-field" placeholder="https://…" value={String(form[fd.name] ?? '')} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                    <label className="btn-outline cursor-pointer px-3 py-2 text-xs"><Upload className="h-4 w-4" />{uploading === fd.name ? '…' : 'Envoyer'}<input type="file" accept="image/*" className="sr-only" onChange={(e) => void upload(fd, e.target.files?.[0])} /></label></div>
                ) : <input id={fd.name} type={fd.type === 'number' ? 'number' : fd.type === 'date' ? 'date' : fd.type === 'datetime' ? 'datetime-local' : 'text'} className="input-field" value={String(form[fd.name] ?? '')} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />}
              {fd.help && <p className="mt-1 text-xs text-neutral-500">{fd.help}</p>}
              {errors[fd.name] && <p role="alert" className="mt-1 text-xs text-error-500">{errors[fd.name]}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
        </form>
      </Modal>

      <ConfirmDialog open={toDelete !== null} title="Confirmer la suppression" message={`Supprimer définitivement « ${String(toDelete?.[config.columns[0].key] ?? '')} » ? Cette action est irréversible.`}
        busy={del.isPending} onCancel={() => setToDelete(null)} onConfirm={() => toDelete && del.mutate(toDelete)} />
    </div>
  );
}

import { useState } from 'react';
import { Copy, Check, Wand2 } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Button } from '@/components/ui/Button';

const fields = [
  { key: 'problem', label: 'Problème', hint: 'Quel problème précis résous-tu, et pour qui ?' },
  { key: 'target', label: 'Cible', hint: 'Qui sont tes utilisateurs ?' },
  { key: 'solution', label: 'Solution', hint: 'Que propose ton produit ?' },
  { key: 'market', label: 'Marché', hint: 'Taille, contexte, concurrence (sans inventer de chiffres).' },
  { key: 'business', label: 'Business model', hint: 'Qui paie, pourquoi, combien ?' },
  { key: 'impact', label: 'Impact', hint: 'Quel changement concret ?' },
  { key: 'prototype', label: 'Prototype', hint: 'Où en es-tu : maquette, démo, version en ligne ?' },
] as const;

type Key = (typeof fields)[number]['key'];
const empty = (k: string) => `[À compléter : ${k}]`;

export default function PitchLab() {
  const [v, setV] = useState<Record<Key, string>>({ problem: '', target: '', solution: '', market: '', business: '', impact: '', prototype: '' });
  const [out, setOut] = useState('');
  const [copied, setCopied] = useState(false);
  const get = (k: Key, label: string) => v[k].trim() || empty(label);

  // Génération locale et déterministe : aucune IA, aucune clé, rien n'est envoyé nulle part.
  const generate = () => {
    setOut([
      '# Structure de pitch — 3 minutes',
      '',
      `1. ACCROCHE (15 s)\n   Une situation concrète liée à : ${get('problem', 'problème')}`,
      `2. LE PROBLÈME (30 s)\n   ${get('problem', 'problème')}\n   Cible : ${get('target', 'cible')}`,
      `3. LA SOLUTION (40 s)\n   ${get('solution', 'solution')}`,
      `4. DÉMONSTRATION (30 s)\n   Avancement : ${get('prototype', 'prototype')}`,
      `5. MARCHÉ & CONCURRENCE (20 s)\n   ${get('market', 'marché')}`,
      `6. BUSINESS MODEL (20 s)\n   ${get('business', 'business model')}`,
      `7. IMPACT (15 s)\n   ${get('impact', 'impact')}`,
      `8. CONCLUSION (10 s)\n   Reformule ta promesse en une phrase et termine par ta demande (partenaire, test, financement).`,
      '',
      'Questions probables du jury : pourquoi maintenant ? qui sont vos concurrents ? comment gagnez-vous de l’argent ? quelle est la prochaine étape ?',
    ].join('\n'));
  };

  const copy = async () => { try { await navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* indisponible */ } };

  return (
    <>
      <Seo title="Pitch Lab" description="Renseigne ton problème, ta cible, ta solution, ton marché et ton business model : obtiens une structure de pitch." />
      <PageHero eyebrow="Pitch Lab" title="Pitch ton projet avec impact" description="Renseigne les sept éléments de ton projet, puis génère une structure de pitch prête à répéter." />
      <section className="section-container grid gap-8 py-12 lg:grid-cols-2">
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="label">{f.label}</label>
              <textarea id={f.key} rows={2} maxLength={600} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} placeholder={f.hint} className="input-field resize-y" />
            </div>
          ))}
          <Button onClick={generate} size="lg"><Wand2 className="h-4 w-4" />Générer ma structure de pitch</Button>
        </div>
        <div>
          {out ? (
            <div className="card sticky top-24 p-5">
              <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">{out}</pre>
              <div className="mt-4"><Button variant="outline" size="sm" onClick={() => void copy()}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copié' : 'Copier'}</Button></div>
            </div>
          ) : <div className="card flex h-full min-h-[16rem] items-center justify-center p-8 text-center text-sm text-neutral-500">Ta structure de pitch apparaîtra ici.</div>}
        </div>
      </section>
    </>
  );
}

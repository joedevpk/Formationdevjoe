import { Link } from 'react-router-dom';
import { Award, BadgeCheck, Eye, ShieldAlert } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { QueryState } from '@/components/ui/QueryState';
import { Button } from '@/components/ui/Button';
import { DownloadCertificateButton, ShareCertificateButton } from '@/components/training/CertificateSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTrainingCertificates } from '@/lib/training/api';
import { formatPeriod } from '@/lib/training/format';
import { formatDate } from '@/utils';

export default function Certificates() {
  const { profile } = useAuth();
  const query = useMyTrainingCertificates(profile?.id);
  return (
    <div className="space-y-8">
      <Seo title="Mes certificats" noindex />
      <div><h1 className="text-3xl font-extrabold">Mes certificats</h1><p className="mt-1 text-sm text-neutral-500">Certificats de formation délivrés par JOE DEV CODES, vérifiables publiquement grâce à leur numéro.</p></div>
      <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucun certificat pour le moment" emptyText="Ton certificat apparaît ici dès que la formation est terminée et que les conditions de la session sont remplies." emptyAction={<Button to="/app/formations" variant="outline">Mes formations</Button>}>
        {(list) => (
          <div className="grid gap-5 lg:grid-cols-2">
            {list.map((c) => {
              const revoked = c.status === 'REVOQUE';
              const period = formatPeriod(c.period_start, c.period_end);
              return (
                <article key={c.id} className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-6 shadow-glass dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950" aria-label={`Certificat ${c.certificate_number}`}>
                  <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-[1.25rem] border border-[#a07c3b]/40" />
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between">
                      <Award className="h-8 w-8 text-[#a07c3b]" aria-hidden="true" />
                      {revoked ? <span className="badge-error"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />Révoqué</span> : <span className="badge-success"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />Valide</span>}
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">Certificat de formation</p>
                      <h2 className="mt-1 font-serif text-2xl font-bold">{c.course_title ?? 'Formation'}</h2>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{[period, c.location].filter(Boolean).join(' · ')}</p>
                    </div>
                    <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm"><div><dt className="text-xs text-neutral-500">Numéro</dt><dd className="font-mono font-semibold">{c.certificate_number}</dd></div><div><dt className="text-xs text-neutral-500">Délivré le</dt><dd className="font-semibold">{formatDate(c.issued_at)}</dd></div></dl>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link to={`/app/certificats/${c.id}`} className="btn-outline px-4 py-2 text-xs"><Eye className="h-3.5 w-3.5" aria-hidden="true" />Voir</Link>
                      <DownloadCertificateButton certificate={c} label="Télécharger PDF" className="btn-primary px-4 py-2 text-xs" />
                      <Link to={`/verify-certificate/${encodeURIComponent(c.certificate_number)}`} className="btn-outline px-4 py-2 text-xs">Vérifier</Link>
                      {!revoked && <ShareCertificateButton certificate={c} label="Partager" className="btn-outline px-4 py-2 text-xs" />}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </QueryState>
    </div>
  );
}

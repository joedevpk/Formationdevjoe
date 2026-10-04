import { useParams } from 'react-router-dom';
import { BadgeCheck, ShieldAlert, SearchX } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { LoadingState } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useVerifiedCertificate } from '@/lib/training/api';
import { formatPeriod } from '@/lib/training/format';
import { certDate } from '@/lib/training/certText';

const Row = ({ label, value }: { label: string; value?: string | null }) => value ? (
  <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800 sm:flex-row sm:items-baseline sm:justify-between">
    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
    <dd className="text-sm font-semibold sm:text-right">{value}</dd>
  </div>
) : null;

/** Page publique de vérification : seules les informations non sensibles du certificat sont affichées. */
export default function VerifyCertificate() {
  const { certificateNumber } = useParams();
  const q = useVerifiedCertificate(certificateNumber);
  const c = q.data;

  return (
    <section className="section-container flex min-h-[60vh] items-start justify-center py-12 sm:py-20">
      <Seo title="Vérification de certificat" description="Vérifiez l’authenticité d’un certificat de formation délivré par JOE DEV CODES." noindex />
      <div className="w-full max-w-xl">
        {q.isLoading ? <LoadingState message="Vérification en cours…" /> : q.isError ? (
          <div role="alert" className="card space-y-3 p-8 text-center">
            <p className="font-semibold">Vérification momentanément indisponible.</p>
            <p className="text-sm text-neutral-500">Le service ne répond pas. Vérifie ta connexion puis réessaie.</p>
            <Button variant="outline" size="sm" onClick={() => void q.refetch()}>Réessayer</Button>
          </div>
        ) : !c?.found ? (
          <div className="card space-y-3 p-8 text-center">
            <SearchX className="mx-auto h-10 w-10 text-neutral-400" aria-hidden="true" />
            <h1 className="text-2xl font-extrabold">Certificat introuvable</h1>
            <p className="text-sm text-neutral-500">Aucun certificat ne correspond au numéro <span className="font-mono">{certificateNumber}</span>. Vérifie le numéro ou rescanne le QR code.</p>
          </div>
        ) : c.status === 'REVOQUE' ? (
          <div className="card space-y-4 border-error-500/50 p-8 text-center" role="status">
            <ShieldAlert className="mx-auto h-12 w-12 text-error-500" aria-hidden="true" />
            <h1 className="text-2xl font-extrabold text-error-600 dark:text-error-400">CERTIFICAT RÉVOQUÉ</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Ce certificat n’est plus valide.</p>
            <p className="font-mono text-sm">{c.certificate_number}</p>
          </div>
        ) : (
          <div className="card overflow-hidden border-success-500/40" role="status">
            <div className="space-y-2 bg-success-500/5 p-8 text-center">
              <BadgeCheck className="mx-auto h-12 w-12 text-success-600" aria-hidden="true" />
              <h1 className="text-2xl font-extrabold">Certificat vérifié</h1>
              <span className="badge-success">VALIDE</span>
            </div>
            <dl className="px-6 pb-4 pt-2 sm:px-8">
              <Row label="Participant" value={c.holder_name} />
              <Row label="Formation" value={c.course_title} />
              <Row label="Période" value={formatPeriod(c.period_start, c.period_end)} />
              <Row label="Durée" value={c.duration_label} />
              <Row label="Lieu" value={c.location} />
              <Row label="Numéro du certificat" value={c.certificate_number} />
              <Row label="Date de délivrance" value={certDate(c.issued_at)} />
            </dl>
            <p className="border-t border-neutral-100 px-6 py-4 text-center text-xs text-neutral-500 dark:border-neutral-800">Certificat de formation délivré par JOE DEV CODES.</p>
          </div>
        )}
      </div>
    </section>
  );
}

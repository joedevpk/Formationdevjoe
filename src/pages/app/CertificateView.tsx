import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { QueryState } from '@/components/ui/QueryState';
import { Button } from '@/components/ui/Button';
import { CertificateSheet, DownloadCertificateButton, ShareCertificateButton } from '@/components/training/CertificateSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useCertificate } from '@/lib/training/api';
import { buildVerifyQr } from '@/lib/training/pdf/generate';

export default function CertificateView() {
  const { id } = useParams();
  const { profile } = useAuth();
  const q = useCertificate(id, profile?.id);
  const number = q.data?.certificate_number;
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (number) void buildVerifyQr(number).then((u) => alive && setQr(u));
    return () => { alive = false; };
  }, [number]);
  return (
    <div className="space-y-6">
      <Seo title="Mon certificat" noindex />
      <Link to="/app/certificats" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Mes certificats</Link>
      <QueryState query={q} isEmpty={(d) => d === null} emptyTitle="Certificat introuvable" emptyAction={<Button to="/app/certificats" variant="outline">Mes certificats</Button>}>
        {(c) => {
          if (!c) return null;
          return (
            <>
              {c.status === 'REVOQUE' && <p role="alert" className="rounded-xl border border-error-500/40 bg-error-500/5 p-4 text-sm font-semibold">Ce certificat a été révoqué : il n’est plus valide.</p>}
              <CertificateSheet certificate={c} qr={qr} />
              <div className="flex flex-wrap items-center gap-3">
                <DownloadCertificateButton certificate={c} />
                <Link to={`/verify-certificate/${encodeURIComponent(c.certificate_number)}`} className="btn-outline px-5 py-2.5">Vérifier</Link>
                {c.status === 'VALIDE' && <ShareCertificateButton certificate={c} />}
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}

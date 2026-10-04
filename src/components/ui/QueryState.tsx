import { type ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { LoadingState } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

interface Props<T> {
  query: { isLoading: boolean; isError: boolean; data: T | undefined; refetch: () => unknown };
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: ReactNode;
  children: (data: T) => ReactNode;
}

/** Gère les 4 états : chargement, erreur, vide, succès. */
export function QueryState<T>({ query, isEmpty, emptyTitle = 'Rien à afficher pour le moment', emptyText, emptyAction, children }: Props<T>) {
  if (query.isLoading) return <LoadingState message="Chargement…" />;
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-error-500" />
        <p className="font-semibold">Contenu momentanément indisponible.</p>
        <p className="max-w-md text-sm text-neutral-500">Le service ne répond pas pour le moment. Vérifie ta connexion puis réessaie.</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Réessayer</Button>
      </div>
    );
  }
  const data = query.data;
  if (data === undefined || (isEmpty && isEmpty(data))) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Inbox className="h-10 w-10 text-neutral-400" />
        <p className="font-semibold">{emptyTitle}</p>
        {emptyText && <p className="max-w-md text-sm text-neutral-500">{emptyText}</p>}
        {emptyAction && <div className="mt-3">{emptyAction}</div>}
      </div>
    );
  }
  return <>{children(data)}</>;
}

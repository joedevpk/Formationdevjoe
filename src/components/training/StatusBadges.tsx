import { Badge } from '@/components/ui/Badge';
import type { RegistrationStatus, TrainingSession } from '@/lib/training/types';
import { displaySessionStatus, registrationStatus } from '@/lib/training/format';

export function SessionStatusBadge({ session, taken }: { session: Pick<TrainingSession, 'status' | 'capacity'>; taken: number }) {
  const d = displaySessionStatus(session, taken);
  return <Badge variant={d.variant}>{d.label}</Badge>;
}

export function RegistrationBadge({ status, long = false }: { status: RegistrationStatus; long?: boolean }) {
  const r = registrationStatus[status];
  return <Badge variant={r.variant}>{long ? r.label : r.short}</Badge>;
}

export function PresentielBadge() {
  return <span className="badge-primary">Formation présentielle</span>;
}

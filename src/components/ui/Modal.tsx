import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white p-6 shadow-glass-lg dark:border-neutral-800 dark:bg-neutral-950 sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Supprimer', busy, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button variant="danger" disabled={busy} onClick={onConfirm}>{busy ? '…' : confirmLabel}</Button>
      </div>
    </Modal>
  );
}

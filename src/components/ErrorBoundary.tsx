import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** `page` : plein écran (boundary global). `inline` : dans la zone de contenu, navbar et footer restent visibles. */
  variant?: 'page' | 'inline';
  /** Quand cette valeur change (ex. l'URL), une erreur affichée est effacée — sans jamais remonter des enfants sains. */
  resetKey?: string;
}

interface State { hasError: boolean }

/**
 * Intercepte les erreurs de rendu pour éviter l'écran noir.
 * La stack trace n'est jamais affichée à l'utilisateur : elle part uniquement dans la console.
 * Volontairement sans dépendance (pas de Router, pas de contexte) pour rester fonctionnel
 * même si un provider est lui-même en échec.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) this.setState({ hasError: false });
  }

  private retry = () => this.setState({ hasError: false });

  // Rechargement complet : repart d'un état applicatif propre.
  private goHome = () => window.location.assign('/');

  render() {
    if (!this.state.hasError) return this.props.children;
    const fullPage = this.props.variant !== 'inline';
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-4 px-6 text-center ${fullPage ? 'min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100' : 'py-24'}`}
      >
        <AlertTriangle className="h-12 w-12 text-error-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          Quelque chose s’est mal passé. Tu peux réessayer ou revenir à l’accueil.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={this.retry} className="btn-secondary px-5 py-2.5">
            Réessayer
          </button>
          <button type="button" onClick={this.goHome} className="btn-outline px-5 py-2.5">
            Retour à l’accueil
          </button>
        </div>
      </div>
    );
  }
}

import {
  type ReactNode,
  type ComponentType,
  isValidElement,
  createElement,
} from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({
  size = 'md',
  className = '',
}: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          ${sizes[size]}
          animate-spin
          rounded-full
          border-2
          border-neutral-200
          dark:border-neutral-700
          border-t-primary-600
          dark:border-t-primary-400
        `}
      />
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  children?: ReactNode;
}

export function LoadingState({
  message,
  children,
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <Spinner size="lg" />

      {message && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {message}
        </p>
      )}

      {children}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode | ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  let iconContent: ReactNode = null;

  if (icon) {
    if (isValidElement(icon)) {
      iconContent = icon;
    } else {
      try {
        iconContent = createElement(
          icon as ComponentType<{ className?: string }>,
          {
            className:
              'w-12 h-12 text-neutral-400 dark:text-neutral-500',
          }
        );
      } catch {
        iconContent = null;
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {iconContent && <div className="mb-4">{iconContent}</div>}

      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
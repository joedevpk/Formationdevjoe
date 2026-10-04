import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
}

export function ProgressBar({ value, max = 100, label, className, color = 'primary' }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    accent: 'from-accent-500 to-accent-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
    error: 'from-error-500 to-error-600',
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r', colors[color])}
        />
      </div>
    </div>
  );
}

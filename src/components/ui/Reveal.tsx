import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';

/** Apparition discrète au scroll (désactivée si l'utilisateur préfère réduire les animations). */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

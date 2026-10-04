import { motion, useReducedMotion, useScroll } from 'framer-motion';

/** Fine barre de lecture, sobre et sans dégradé. Masquée si l'utilisateur réduit les animations. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <motion.div aria-hidden="true" style={{ scaleX: scrollYProgress }} className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-0.5 origin-left bg-primary-600" />;
}

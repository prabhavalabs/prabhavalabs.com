import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'motion/react';
import { shouldLoadEnhancedVisualInBrowser } from '../lib/enhanced-visuals.js';

const OriginGalaxy = lazy(() => import('./OriginGalaxy'));

const EASE = [0.22, 1, 0.36, 1] as const;

const blocks = [
  {
    label: 'Build in public',
    body: 'Every repository is a working notebook. Commits, mistakes, refactors — the full history stays visible, because the process is as valuable as the result.',
  },
  {
    label: 'Stories over specs',
    body: 'A tool without its origin story is just code. Each project here ships with the why: the itch it scratched, the dead ends, and what finally worked.',
  },
];

export default function Philosophy() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [loadVisual, setLoadVisual] = useState(false);
  useEffect(() => setLoadVisual(shouldLoadEnhancedVisualInBrowser()), []);

  // Parallax: the overscanned video drifts vertically as the section scrolls.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], [-36, 36]);

  return (
    <section
      id="philosophy"
      ref={ref}
      className="overflow-hidden bg-black px-6 py-28 md:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: EASE }}
          className="font-serif-display mb-16 text-5xl tracking-tight text-white md:mb-24 md:text-7xl lg:text-8xl"
        >
          Curiosity <em className="italic text-white/40">x</em> Craft
        </motion.h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
            className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-black"
          >
            <motion.div style={{ y: videoY }} className="absolute -inset-y-10 inset-x-0">
              {loadVisual && (
                <Suspense fallback={null}>
                  <OriginGalaxy />
                </Suspense>
              )}
            </motion.div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            {blocks.map((b, i) => (
              <div key={b.label}>
                {i > 0 && <div className="my-8 h-px w-full bg-white/10" />}
                <p className="mb-4 text-xs uppercase tracking-widest text-white/40">{b.label}</p>
                <p className="text-base leading-relaxed text-white/70 md:text-lg">{b.body}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { shouldLoadEnhancedVisualInBrowser } from '../lib/enhanced-visuals.js';

const ParticleWave = lazy(() => import('./ParticleWave'));

const EASE = [0.22, 1, 0.36, 1] as const;

export type ShowcaseProject = {
  title: string;
  tagline: string;
  description: string;
  tags: string[];
  repo?: string;
};

export default function Showcase({ project }: { project: ShowcaseProject | null }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [loadVisual, setLoadVisual] = useState(false);
  useEffect(() => setLoadVisual(shouldLoadEnhancedVisualInBrowser()), []);

  if (!project) return null;

  return (
    <section
      ref={ref}
      className="relative flex min-h-[85vh] flex-col justify-end overflow-hidden bg-black"
    >
      {/* Full-bleed interactive particle terrain. */}
      <div className="absolute inset-0">
        {loadVisual && (
          <Suspense fallback={null}>
            <ParticleWave />
          </Suspense>
        )}
      </div>
      {/* Blend edges into the surrounding black sections. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 md:pb-24">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, ease: EASE }}
            className="liquid-glass max-w-md rounded-2xl bg-black/30 p-6 backdrop-blur-md md:p-8"
          >
            <p className="mb-3 text-xs uppercase tracking-widest text-white/50">
              Featured project
            </p>
            <h3 className="font-serif-display mb-2 text-2xl tracking-tight text-white md:text-3xl">
              {project.title}
            </h3>
            <p className="text-sm leading-relaxed text-white/70 md:text-base">
              {project.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {project.repo && (
            <motion.a
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="liquid-glass flex items-center gap-2 rounded-full bg-black/30 px-8 py-3 text-sm font-medium text-white backdrop-blur-md"
            >
              View source <ArrowUpRight size={16} />
            </motion.a>
          )}
        </div>
      </div>
    </section>
  );
}

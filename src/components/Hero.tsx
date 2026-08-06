import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Radio } from 'lucide-react';
import { GitHubMark } from './BrandIcons';
import { shouldLoadEnhancedVisualInBrowser } from '../lib/enhanced-visuals.js';

// three.js touches `window` at import time — only load in the browser so the
// rest of the hero stays server-rendered.
const HeroGlobe = lazy(() => import('./HeroGlobe'));

const EASE = [0.22, 1, 0.36, 1] as const;

function Words({
  text,
  className = '',
  italicWords = [] as string[],
}: {
  text: string;
  className?: string;
  italicWords?: string[];
}) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          className={`inline-block overflow-hidden pb-[0.08em] align-bottom ${
            i < words.length - 1 ? 'mr-[0.24em]' : ''
          }`}
        >
          <span
            className={`inline-block ${italicWords.includes(w) ? 'italic text-white/60' : ''}`}
          >
            {w}
          </span>
        </span>
      ))}
    </span>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [loadGlobe, setLoadGlobe] = useState(false);

  useEffect(() => {
    if (!shouldLoadEnhancedVisualInBrowser()) return;

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timerId: number | undefined;
    const activate = () => setLoadGlobe(true);
    const schedule = () => {
      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(activate, { timeout: 2500 });
      } else {
        timerId = window.setTimeout(activate, 1200);
      }
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      window.removeEventListener('load', schedule);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const globeY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const globeOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.1]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative flex min-h-screen flex-col overflow-hidden bg-black"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(124,111,212,0.14)_0%,_transparent_60%)]" />

      {/* The globe is a progressive enhancement for capable desktop devices. */}
      <motion.div
        style={{ y: globeY, opacity: globeOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-[-42vh] z-0 mx-auto h-[95vh] w-full max-w-6xl md:bottom-[-52vh] md:h-[115vh]"
      >
        {loadGlobe && (
          <Suspense fallback={null}>
            <HeroGlobe onLocated={setPlace} />
          </Suspense>
        )}
      </motion.div>

      {/* Soft fade so the globe melts into the next section. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-black to-transparent" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="pointer-events-none relative z-10 flex flex-col items-center px-6 pt-40 text-center md:pt-44"
      >
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.35em] text-white/50">
          An independent open-source studio
        </p>

        <h1 className="font-serif-display max-w-5xl text-6xl leading-[1.02] tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl">
          <Words text="Where ideas" />
          <br />
          <Words text="take origin." italicWords={['origin.']} />
        </h1>

        <p className="mt-7 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
          ප්‍රභව — <em className="italic text-white/80">prabhava</em> — is the
          Sanskrit word for origin. Open-source tools, built in public from Sri Lanka, connected to
          everywhere.
        </p>

        <div className="pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-4">
          <motion.a
            href="/projects"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black"
          >
            Explore the work
          </motion.a>
          <motion.a
            href="https://github.com/prabhavalabs"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="liquid-glass flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            <GitHubMark size={16} />
            Follow along
          </motion.a>
        </div>

        <div data-location-slot aria-live="polite" className="mt-8 hidden min-h-8 md:block">
          {place ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="liquid-glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white/60"
            >
              <Radio size={12} className="text-violet-300/80" aria-hidden="true" />
              signal received from {place}
            </motion.div>
          ) : null}
        </div>
      </motion.div>
    </section>
  );
}

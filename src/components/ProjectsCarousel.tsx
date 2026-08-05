import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, type ProjectCard } from './ProjectsGrid';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Horizontal project carousel for the landing page: native scroll with snap
 * points (so touch and trackpads feel right), arrow buttons, and edge fades.
 * The /projects page keeps the full grid.
 */
export default function ProjectsCarousel({ projects }: { projects: ProjectCard[] }) {
  const headRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(headRef, { once: true, margin: '-100px' });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Mouse drag-to-scroll. Touch devices scroll the track natively; this
  // covers desktop pointers, with click suppression after a real drag and
  // snap paused while dragging so it doesn't fight the pointer.
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const el = trackRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || !drag.current.down) return;
    const dx = e.clientX - drag.current.startX;

    if (!drag.current.moved) {
      if (Math.abs(dx) <= 4) return;
      drag.current.moved = true;
      el.setPointerCapture(e.pointerId);
      el.style.scrollBehavior = 'auto';
      el.style.scrollSnapType = 'none';
    }

    e.preventDefault();
    el.scrollLeft = drag.current.startLeft - dx;
  };

  const endDrag = () => {
    const el = trackRef.current;
    if (!el || !drag.current.down) return;
    drag.current.down = false;
    el.style.scrollBehavior = '';
    el.style.scrollSnapType = '';
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const tolerance = 2;
    setAtStart(el.scrollLeft <= tolerance);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - tolerance);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    onScroll();
    const observer = new ResizeObserver(onScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onScroll]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]') as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : 400;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section id="projects" className="relative overflow-hidden bg-black py-24 md:py-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]" />

      <div className="relative">
        <motion.div
          ref={headRef}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE }}
          className="mx-auto mb-12 flex max-w-6xl items-end justify-between px-6 md:mb-16"
        >
          <h2 className="font-serif-display text-3xl tracking-tight text-white md:text-5xl">
            The <em className="italic text-white/60">open</em> shelf
          </h2>
          <div className="flex items-center gap-3">
            <a
              href="/projects"
              className="mr-2 hidden text-sm text-white/40 transition-colors hover:text-white md:block"
            >
              All {projects.length} projects →
            </a>
            <button
              type="button"
              aria-label="Previous projects"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              className="liquid-glass rounded-full p-3 text-white/70 transition-all hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next projects"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              className="liquid-glass rounded-full p-3 text-white/70 transition-all hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black to-transparent md:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black to-transparent md:w-20" />

        <div
          ref={trackRef}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          onDragStart={(e) => e.preventDefault()}
          onClickCapture={onClickCapture}
          aria-label="Open-source projects"
          className="scrollbar-none flex cursor-grab select-none snap-x snap-mandatory scroll-pl-6 items-stretch gap-6 overflow-x-auto px-6 pb-4 active:cursor-grabbing md:scroll-pl-[max(1.5rem,calc((100vw-72rem)/2))] md:px-[max(1.5rem,calc((100vw-72rem)/2))]"
        >
          {projects.map((p, i) => (
            <div
              key={p.id}
              data-card
              className="flex w-[85vw] max-w-sm shrink-0 snap-start sm:w-[380px]"
            >
              <Card project={p} index={i} instant />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

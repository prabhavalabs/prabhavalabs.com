import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

export type ProjectCard = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  tags: string[];
  repo?: string;
  status: 'active' | 'incubating' | 'archived';
  image?: string;
};

export const statusStyle: Record<ProjectCard['status'], string> = {
  active: 'text-emerald-300/80 border-emerald-300/20',
  incubating: 'text-amber-300/80 border-amber-300/20',
  archived: 'text-white/40 border-white/10',
};

export function Card({
  project,
  index,
  instant = false,
  priority = false,
}: {
  project: ProjectCard;
  index: number;
  /** Skip scroll-reveal — needed inside horizontal carousels. */
  instant?: boolean;
  /** Prioritize only an image that can be the page's initial LCP candidate. */
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const image = project.image
    ? project.image.replace(/\.[^./]+$/, '-card.webp')
    : `/images/card-${(index % 3) + 1}.jpg`;

  return (
    <motion.div
      ref={ref}
      initial={instant || priority ? false : { opacity: 0, y: 50 }}
      animate={instant || priority || inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.8,
        ease: EASE,
        delay: instant || priority ? 0 : (index % 3) * 0.12,
      }}
      className="liquid-glass group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl transition-colors hover:bg-white/[0.03]"
    >
      <a
        href={`/projects/${project.id}`}
        aria-label={`${project.title} — read the story`}
        className="absolute inset-0 z-[1]"
      />
      <div className="relative aspect-video overflow-hidden">
        <img
          src={image}
          alt=""
          width="720"
          height="405"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col justify-between p-6 md:p-8">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <span
            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest ${statusStyle[project.status]}`}
          >
            {project.status}
          </span>
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.title} repository`}
              className="liquid-glass relative z-[2] rounded-full p-2 text-white/60 transition-all group-hover:text-white"
            >
              <ArrowUpRight size={16} />
            </a>
          )}
        </div>
        <h3 className="font-serif-display mb-1 text-xl tracking-tight text-white md:text-2xl">
          {project.title}
        </h3>
        <p className="mb-4 text-xs uppercase tracking-widest text-white/40">{project.tagline}</p>
        <p className="text-sm leading-relaxed text-white/50">{project.description}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {project.tags.map((t) => (
          <span key={t} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/40">
            {t}
          </span>
        ))}
      </div>
      </div>
    </motion.div>
  );
}

export default function ProjectsGrid({
  projects,
  standalone = false,
}: {
  projects: ProjectCard[];
  standalone?: boolean;
}) {
  const headRef = useRef<HTMLDivElement>(null);
  const inView = useInView(headRef, { once: true, margin: '-100px' });

  return (
    <section
      id="projects"
      className={`relative overflow-hidden bg-black px-6 ${standalone ? 'py-16 md:py-20' : 'py-24 md:py-36'}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl">
        {!standalone && (
          <motion.div
            ref={headRef}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE }}
            className="mb-12 flex items-end justify-between md:mb-16"
          >
            <h2 className="font-serif-display text-3xl tracking-tight text-white md:text-5xl">
              The <em className="italic text-white/60">open</em> shelf
            </h2>
            <a href="/projects" className="hidden text-sm text-white/40 transition-colors hover:text-white md:block">
              All {projects.length} project{projects.length === 1 ? '' : 's'} →
            </a>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {projects.map((p, i) => (
            <Card key={p.id} project={p} index={i} priority={standalone && i < 3} />
          ))}
        </div>
      </div>
    </section>
  );
}

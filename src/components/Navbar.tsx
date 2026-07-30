import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { GitHubMark } from './BrandIcons';

const links = [
  { label: 'Projects', href: '/projects' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/#about' },
];

export default function Navbar({ currentPath = '/' }: { currentPath?: string }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const isActive = (href: string) =>
    href.startsWith('/#') ? false : currentPath === href || currentPath.startsWith(href + '/');

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <motion.nav
      aria-label="Primary navigation"
      initial={reduceMotion ? false : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="fixed inset-x-0 top-0 z-50 px-4 py-4 md:px-6 md:py-6"
    >
      <div className="liquid-glass relative mx-auto flex max-w-5xl items-center justify-between overflow-visible rounded-[1.75rem] bg-black/70 px-4 py-3 backdrop-blur-2xl sm:px-5 md:rounded-full md:px-6">
        <a href="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          {/* Animated origin mark: rings ripple outward and fade. */}
          <span aria-hidden="true" className="relative flex h-7 w-7 shrink-0 items-center justify-center">
            <span className="h-[7px] w-[7px] rounded-full bg-white" />
            <span className="logo-ripple absolute inset-0 rounded-full border-[1.5px] border-white/80" />
            <span className="logo-ripple logo-ripple-delayed absolute inset-0 rounded-full border border-violet-300/70" />
          </span>
          <span className="flex items-baseline gap-2">
            <span className="font-sinhala text-lg leading-none text-white">ප්‍රභව</span>
            <span className="font-serif-display text-lg italic leading-none text-white/90">Labs</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-white ${
                isActive(l.href) ? 'text-white' : 'text-white/70'
              }`}
            >
              {l.label}
              {isActive(l.href) && (
                <span className="mt-0.5 block h-px w-full bg-white/60" aria-hidden="true" />
              )}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href="https://github.com/prabhavalabs"
            target="_blank"
            rel="noreferrer"
            aria-label="Prabhava Labs on GitHub"
            className="liquid-glass flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5 sm:px-4"
          >
            <GitHubMark size={16} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setOpen((value) => !value)}
            className="liquid-glass flex rounded-full p-2.5 text-white transition-colors hover:bg-white/5 md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <motion.div
            id="mobile-navigation"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22 }}
            className="liquid-glass absolute inset-x-0 top-[calc(100%+0.75rem)] flex flex-col rounded-3xl bg-black/90 p-3 backdrop-blur-2xl md:hidden"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`rounded-2xl px-5 py-3.5 text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-white text-black'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}

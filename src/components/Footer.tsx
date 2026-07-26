import { useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { GlobeIcon, ArrowRight, Check, Loader2 } from 'lucide-react';
import { GitHubMark, XMark } from './BrandIcons';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const subscribe = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === 'loading' || state === 'done') return;
    setState('loading');
    try {
      const honeypot = (
        e.currentTarget.elements.namedItem('website') as HTMLInputElement | null
      )?.value;
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website: honeypot, consent }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState('done');
        setMessage("You're on the list. New releases and write-ups, no noise.");
      } else {
        setState('error');
        setMessage(data.error ?? 'Something went wrong. Try again in a bit.');
      }
    } catch {
      setState('error');
      setMessage('Could not reach the server. Try again in a bit.');
    }
  };

  return (
    <footer ref={ref} className="relative overflow-hidden bg-black px-6 pb-10 pt-28 md:pt-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.05)_0%,_transparent_60%)]" />

      <div className="relative mx-auto max-w-5xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: EASE }}
          className="font-serif-display text-4xl leading-tight tracking-tight text-white md:text-6xl"
        >
          Follow the work <em className="italic text-white/60">as it happens.</em>
        </motion.h2>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          className="mx-auto mt-10 w-full max-w-xl"
          onSubmit={subscribe}
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <div className="liquid-glass flex items-center gap-3 rounded-full py-2 pl-6 pr-2 focus-within:ring-2 focus-within:ring-violet-300/70">
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === 'done'}
              placeholder="Enter your email"
              aria-describedby="newsletter-note newsletter-status"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/60 disabled:opacity-60"
            />
            {/* Honeypot — hidden from humans, tempting for bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              disabled={state === 'loading' || state === 'done'}
              className="shrink-0 rounded-full bg-white p-3 text-black transition-transform hover:scale-105 active:scale-95 disabled:scale-100"
            >
              {state === 'loading' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : state === 'done' ? (
                <Check size={20} />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          </div>
          <label className="mx-auto mt-4 flex max-w-lg items-start justify-center gap-2.5 text-left text-xs leading-relaxed text-white/65">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={state === 'done'}
              className="mt-0.5 h-4 w-4 shrink-0 accent-violet-300"
            />
            <span>
              I agree to receive occasional project updates. See the{' '}
              <a href="/privacy" className="underline underline-offset-2 hover:text-white">
                privacy note
              </a>{' '}
              for what is stored and how to unsubscribe.
            </span>
          </label>
          <p
            id="newsletter-status"
            aria-live="polite"
            className={`mt-4 text-xs leading-relaxed ${
              state === 'error'
                ? 'text-amber-300/80'
                : state === 'done'
                  ? 'text-emerald-300/80'
                  : 'text-white/60'
            }`}
          >
            {state === 'idle' || state === 'loading'
              ? 'New releases, write-ups, and the occasional story behind a project. No noise.'
              : message}
          </p>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-12 flex justify-center gap-4"
        >
          {[
            { icon: GitHubMark, href: 'https://github.com/prabhavalabs', label: 'GitHub' },
            { icon: XMark, href: 'https://x.com/PravhavaLabs', label: 'X (Twitter)' },
            { icon: GlobeIcon, href: 'https://prabhavalabs.com', label: 'Website' },
          ].map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="liquid-glass rounded-full p-4 text-white/70 transition-all hover:bg-white/5 hover:text-white"
            >
              <Icon size={20} />
            </a>
          ))}
        </motion.div>

        <div className="mt-16 flex flex-col items-center gap-3 border-t border-white/10 pt-8 text-xs text-white/60 md:flex-row md:justify-between">
          <p className="flex items-center gap-4">
            <span>
              <span className="font-sinhala text-white/50">ප්‍රභව</span> Labs — where ideas take
              origin.
            </span>
            <a href="/brand" className="text-white/65 underline-offset-2 transition-colors hover:text-white">
              Brand
            </a>
            <a href="/privacy" className="text-white/65 underline-offset-2 transition-colors hover:text-white">
              Privacy
            </a>
          </p>
          <p className="flex items-center gap-2">
            <span>Made in Sri Lanka</span>
            <img
              src="/images/flag-lk.svg"
              alt="Flag of Sri Lanka"
              className="h-3.5 w-auto rounded-[2px] opacity-90"
            />
          </p>
          <p>© {new Date().getFullYear()} Prabhava Labs. Open source, always.</p>
        </div>
      </div>
    </footer>
  );
}

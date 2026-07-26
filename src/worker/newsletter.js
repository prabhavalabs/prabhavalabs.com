const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_HOSTS = new Set(['prabhavalabs.com', 'www.prabhavalabs.com']);
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase().slice(0, 254);
}

export function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    return ALLOWED_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function checkRateLimit(request, env, now = Date.now()) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return { allowed: true };

  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const rateKey = await sha256(`newsletter-v1:${ip}:${windowStart}`);
  const expiresAt = new Date(windowStart + WINDOW_MS).toISOString();
  const result = await env.DB.prepare(
    `INSERT INTO subscription_rate_limits (rate_key, count, expires_at)
     VALUES (?1, 1, ?2)
     ON CONFLICT(rate_key) DO UPDATE SET count = count + 1
     RETURNING count`
  )
    .bind(rateKey, expiresAt)
    .first();

  return {
    allowed: Number(result?.count ?? 1) <= MAX_ATTEMPTS,
    retryAfter: Math.max(1, Math.ceil((windowStart + WINDOW_MS - now) / 1000)),
  };
}

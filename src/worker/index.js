// Edge worker for prabhavalabs.com: serves the static site and a small
// same-origin API for newsletter subscriptions.
import {
  checkRateLimit,
  isAllowedOrigin,
  isValidEmail,
  normalizeEmail,
} from './newsletter.js';

async function handleSubscribe(request, env) {
  if (!isAllowedOrigin(request.headers.get('Origin'))) {
    return json({ error: 'This request is not allowed' }, 403);
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Expected a JSON request' }, 415);
  }
  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > 2048) {
    return json({ error: 'Request is too large' }, 413);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  // Honeypot: real users never fill the hidden "website" field.
  if (body.website) return json({ ok: true }, 200);
  if (body.consent !== true) {
    return json({ error: 'Please confirm that you want to subscribe' }, 422);
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return json({ error: 'That does not look like an email address' }, 422);
  }

  try {
    const limit = await checkRateLimit(request, env);
    if (!limit.allowed) {
      return json(
        { error: 'Too many attempts. Please try again in a few minutes.' },
        429,
        { 'Retry-After': String(limit.retryAfter) }
      );
    }
    await env.DB.prepare(
      'INSERT OR IGNORE INTO subscribers (email, created_at, source) VALUES (?1, ?2, ?3)'
    )
      .bind(email, new Date().toISOString(), 'site-footer')
      .run();
  } catch (err) {
    console.error('subscribe failed', err);
    return json({ error: 'Something broke on our side. Try again later.' }, 500);
  }

  return json({ ok: true }, 200);
}

function json(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

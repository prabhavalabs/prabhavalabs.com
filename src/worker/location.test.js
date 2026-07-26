import assert from 'node:assert/strict';
import test from 'node:test';
import { locationFromRequest } from './index.js';

test('returns a privacy-safe location from Cloudflare request metadata', () => {
  const location = locationFromRequest({
    cf: {
      city: 'Berlin',
      country: 'DE',
      latitude: '52.5200',
      longitude: '13.4050',
    },
  });

  assert.deepEqual(location, {
    success: true,
    city: 'Berlin',
    country: 'Germany',
    latitude: 52.52,
    longitude: 13.405,
  });
});

test('returns null when geographic coordinates are unavailable', () => {
  assert.equal(locationFromRequest({ cf: {} }), null);
  assert.equal(locationFromRequest({}), null);
});

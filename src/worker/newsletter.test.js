import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin, isValidEmail, normalizeEmail } from './newsletter.js';

test('normalizes a subscriber email without changing meaningful characters', () => {
  assert.equal(normalizeEmail('  Person+Notes@Example.COM  '), 'person+notes@example.com');
});

test('accepts ordinary email addresses and rejects malformed values', () => {
  assert.equal(isValidEmail('person@example.com'), true);
  assert.equal(isValidEmail('person@localhost'), false);
  assert.equal(isValidEmail('not an email'), false);
});

test('allows same-site origins and rejects unrelated sites', () => {
  assert.equal(isAllowedOrigin('https://prabhavalabs.com'), true);
  assert.equal(isAllowedOrigin('https://www.prabhavalabs.com'), true);
  assert.equal(isAllowedOrigin('https://example.com'), false);
  assert.equal(isAllowedOrigin('not-a-url'), false);
});

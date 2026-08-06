import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldLoadEnhancedVisual } from './enhanced-visuals.js';

test('keeps the WebGL hero off constrained devices', () => {
  const constrainedDevices = [
    { viewportWidth: 767 },
    { viewportWidth: 1440, prefersReducedMotion: true },
    { viewportWidth: 1440, saveData: true },
    { viewportWidth: 1440, effectiveType: 'slow-2g' },
    { viewportWidth: 1440, effectiveType: '2g' },
    { viewportWidth: 1440, effectiveType: '3g' },
    { viewportWidth: 1440, deviceMemory: 2 },
    { viewportWidth: 844, pointerFine: false, hoverCapable: false },
  ];

  for (const device of constrainedDevices) {
    assert.equal(
      shouldLoadEnhancedVisual({
        viewportWidth: 1440,
        prefersReducedMotion: false,
        saveData: false,
        effectiveType: '4g',
        deviceMemory: 8,
        pointerFine: true,
        hoverCapable: true,
        ...device,
      }),
      false
    );
  }
});

test('allows the WebGL hero on an unconstrained desktop', () => {
  assert.equal(
    shouldLoadEnhancedVisual({
      viewportWidth: 1440,
      prefersReducedMotion: false,
      saveData: false,
      effectiveType: '4g',
      deviceMemory: 8,
      pointerFine: true,
      hoverCapable: true,
    }),
    true
  );
});

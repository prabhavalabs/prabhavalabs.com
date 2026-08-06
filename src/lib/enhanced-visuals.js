/**
 * Decide whether a device should spend bandwidth and main-thread time on an
 * enhanced WebGL visual.
 */
export function shouldLoadEnhancedVisual({
  viewportWidth,
  prefersReducedMotion = false,
  saveData = false,
  effectiveType,
  deviceMemory,
  pointerFine = true,
  hoverCapable = true,
}) {
  const slowConnection = ['slow-2g', '2g', '3g'].includes(effectiveType);
  const lowMemory = typeof deviceMemory === 'number' && deviceMemory < 4;

  return (
    viewportWidth >= 768 &&
    !prefersReducedMotion &&
    !saveData &&
    !slowConnection &&
    !lowMemory &&
    pointerFine &&
    hoverCapable
  );
}

export function shouldLoadEnhancedVisualInBrowser() {
  const connection = navigator.connection;

  return shouldLoadEnhancedVisual({
    viewportWidth: window.innerWidth,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    deviceMemory: navigator.deviceMemory,
    pointerFine: window.matchMedia('(pointer: fine)').matches,
    hoverCapable: window.matchMedia('(hover: hover)').matches,
  });
}

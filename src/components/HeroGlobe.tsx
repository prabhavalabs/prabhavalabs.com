import { useEffect, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';

// Prabhava Labs' point of origin — Colombo, Sri Lanka.
const ORIGIN = { lat: 6.9271, lng: 79.8612 };

// Ambient traffic keeps the globe alive while the visitor arc is located.
const CITIES: [number, number][] = [
  [37.7749, -122.4194],
  [40.7128, -74.006],
  [51.5074, -0.1278],
  [52.52, 13.405],
  [35.6762, 139.6503],
  [1.3521, 103.8198],
  [-33.8688, 151.2093],
  [19.076, 72.8777],
  [55.7558, 37.6173],
  [-23.5505, -46.6333],
];

type Arc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  isVisitor?: boolean;
};

export default function HeroGlobe({
  onLocated,
}: {
  onLocated?: (place: string) => void;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState<{ features: object[] }>({ features: [] });
  const [arcs, setArcs] = useState<Arc[]>(
    CITIES.map(([lat, lng]) => ({
      startLat: lat,
      startLng: lng,
      endLat: ORIGIN.lat,
      endLng: ORIGIN.lng,
    }))
  );

  // Keep the renderer matched to its responsive hero container.
  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Restore the dotted land masses used by the original globe.
  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/countries.geojson', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Country data failed with ${response.status}`);
        return response.json();
      })
      .then(setCountries)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Could not load globe country data.', error);
      });
    return () => controller.abort();
  }, []);

  // Add a single visitor arc using Cloudflare's same-origin, coarse location.
  // The browser no longer shares the visitor's IP with a third-party service.
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/location', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Location request failed with ${response.status}`);
        return response.json();
      })
      .then((geo) => {
        if (!geo?.success || typeof geo.latitude !== 'number') return;
        setArcs((current) => [
          ...current,
          {
            startLat: geo.latitude,
            startLng: geo.longitude,
            endLat: ORIGIN.lat,
            endLng: ORIGIN.lng,
            isVisitor: true,
          },
        ]);
        const place = [geo.city, geo.country].filter(Boolean).join(', ');
        if (place) onLocated?.(place);
        globeRef.current?.pointOfView(
          {
            lat: (geo.latitude + ORIGIN.lat) / 2,
            lng: (geo.longitude + ORIGIN.lng) / 2,
            altitude: 2.1,
          },
          1600
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Could not locate the visitor arc.', error);
      });
    return () => {
      controller.abort();
    };
  }, [onLocated]);

  const globeMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color('#0a0a14'),
    transparent: true,
    opacity: 0.95,
    shininess: 8,
  });

  const onReady = () => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotateSpeed = 0.55;
    controls.enableRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    globe.pointOfView({ lat: 12, lng: 60, altitude: 2.1 }, 0);
  };

  return (
    <div ref={wrapRef} aria-hidden="true" className="pointer-events-none h-full w-full">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showGraticules={false}
          atmosphereColor="#7c6fd4"
          atmosphereAltitude={0.16}
          hexPolygonsData={countries.features}
          hexPolygonResolution={3}
          hexPolygonMargin={0.72}
          hexPolygonAltitude={0.006}
          hexPolygonColor={() => 'rgba(255,255,255,0.62)'}
          arcsData={arcs}
          arcColor={(arc: object) =>
            (arc as Arc).isVisitor
              ? ['rgba(255,255,255,0.95)', 'rgba(167,139,250,1)']
              : ['rgba(167,139,250,0.35)', 'rgba(255,255,255,0.5)']
          }
          arcStroke={(arc: object) => ((arc as Arc).isVisitor ? 0.9 : 0.42)}
          arcAltitudeAutoScale={0.42}
          arcDashLength={0.45}
          arcDashGap={1.6}
          arcDashAnimateTime={(arc: object) => ((arc as Arc).isVisitor ? 2100 : 3400)}
          ringsData={[ORIGIN]}
          ringColor={() => (time: number) =>
            `rgba(167,139,250,${Math.max(0, 0.7 * (1 - time))})`
          }
          ringMaxRadius={4.5}
          ringPropagationSpeed={1.6}
          ringRepeatPeriod={1400}
          onGlobeReady={onReady}
          rendererConfig={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        />
      )}
    </div>
  );
}

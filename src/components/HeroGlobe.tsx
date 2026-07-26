import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';

const ORIGIN = { lat: 6.9271, lng: 79.8612 };
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

function globePoint(lat: number, lng: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function dottedSphere(radius: number, count: number) {
  const positions = new Float32Array(count * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index++) {
    const y = 1 - (index / (count - 1)) * 2;
    const horizontalRadius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * index;
    positions[index * 3] = Math.cos(theta) * horizontalRadius * radius;
    positions[index * 3 + 1] = y * radius;
    positions[index * 3 + 2] = Math.sin(theta) * horizontalRadius * radius;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

export default function HeroGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new Scene();
    const camera = new PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(0, 0.5, 6.8);

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    const globe = new Group();
    globe.rotation.set(-0.08, -0.9, 0.03);
    scene.add(globe);

    const globeMesh = new Mesh(
      new SphereGeometry(2.15, 64, 48),
      new MeshPhongMaterial({
        color: new Color('#070812'),
        transparent: true,
        opacity: 0.96,
        shininess: 8,
      })
    );
    globe.add(globeMesh);

    const dotGeometry = dottedSphere(2.18, 4200);
    const dotMaterial = new PointsMaterial({
      color: '#f4f1ff',
      size: 0.018,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    });
    const dots = new Points(dotGeometry, dotMaterial);
    globe.add(dots);

    const arcMaterials: LineBasicMaterial[] = [];
    for (const [lat, lng] of CITIES) {
      const start = globePoint(lat, lng, 2.19);
      const end = globePoint(ORIGIN.lat, ORIGIN.lng, 2.19);
      const middle = start
        .clone()
        .add(end)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(2.75 + start.distanceTo(end) * 0.14);
      const curve = new CatmullRomCurve3([start, middle, end]);
      const geometry = new BufferGeometry().setFromPoints(curve.getPoints(56));
      const material = new LineBasicMaterial({
        color: '#a78bfa',
        transparent: true,
        opacity: 0.36,
        blending: AdditiveBlending,
      });
      arcMaterials.push(material);
      globe.add(new Line(geometry, material));
    }

    const originGeometry = new BufferGeometry().setFromPoints([
      globePoint(ORIGIN.lat, ORIGIN.lng, 2.23),
    ]);
    const originMaterial = new PointsMaterial({
      color: '#ffffff',
      size: 0.13,
      transparent: true,
      opacity: 0.95,
      blending: AdditiveBlending,
    });
    globe.add(new Points(originGeometry, originMaterial));

    scene.add(new AmbientLight('#b8b4ff', 0.72));
    const keyLight = new DirectionalLight('#ffffff', 1.8);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersectionObserver.observe(container);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let velocity = 0;
    const pointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      container.setPointerCapture?.(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      velocity = deltaX * 0.003;
      globe.rotation.y += velocity;
      globe.rotation.x = Math.max(-0.55, Math.min(0.55, globe.rotation.x + deltaY * 0.0015));
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const pointerUp = () => {
      dragging = false;
    };
    container.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);

    let frame = 0;
    let elapsed = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      if (!visible) return;
      elapsed += reducedMotion ? 0 : 0.012;
      if (!dragging && !reducedMotion) {
        globe.rotation.y += 0.0017 + velocity;
        velocity *= 0.92;
      }
      arcMaterials.forEach((material, index) => {
        material.opacity = 0.25 + Math.sin(elapsed + index * 0.7) * 0.12;
      });
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      dotGeometry.dispose();
      dotMaterial.dispose();
      globeMesh.geometry.dispose();
      (globeMesh.material as MeshPhongMaterial).dispose();
      originGeometry.dispose();
      originMaterial.dispose();
      for (const child of globe.children) {
        if (child instanceof Line) {
          child.geometry.dispose();
          (child.material as LineBasicMaterial).dispose();
        }
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing"
    />
  );
}

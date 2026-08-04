'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Float } from '@react-three/drei';
import * as THREE from 'three';

// ─── Mascot Billboard ─────────────────────────────────────────────────────────

function MascotMesh() {
  const texture = useTexture('/assets/MASKOT.png');
  texture.premultiplyAlpha = false;
  texture.needsUpdate = true;

  return (
    <mesh position={[0, 0.1, 0]}>
      <planeGeometry args={[2.2, 2.6]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Particle Orb ─────────────────────────────────────────────────────────────

interface OrbProps {
  position: [number, number, number];
  color: string;
  size: number;
  speed: number;
  offset: number;
}

function Orb({ position, color, size, speed, offset }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * speed + offset;
    meshRef.current.position.y = position[1] + Math.sin(t) * 0.25;
    meshRef.current.position.x = position[0] + Math.cos(t * 0.7) * 0.12;
    meshRef.current.scale.setScalar(0.7 + Math.sin(t * 1.5) * 0.3);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.75} />
    </mesh>
  );
}

// ─── Glow Ring ────────────────────────────────────────────────────────────────

function GlowRing({
  radius, tube, color, speed, axis,
}: { radius: number; tube: number; color: string; speed: number; axis: 'x' | 'y' | 'z' }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * speed;
    if (axis === 'y') meshRef.current.rotation.y = t;
    if (axis === 'x') meshRef.current.rotation.x = t;
    if (axis === 'z') meshRef.current.rotation.z = t;
  });
  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[radius, tube, 8, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} wireframe />
    </mesh>
  );
}

// ─── Mouse-reactive Scene ─────────────────────────────────────────────────────

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ mouse }) => {
    if (!groupRef.current) return;
    const targetX = mouse.y * -0.25;
    const targetY = mouse.x * 0.25;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.05;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.05;
  });

  const orbs = useMemo(() => [
    { position: [-1.3, 0.7, -0.5] as [number, number, number], color: '#00E5FF', size: 0.07, speed: 0.9, offset: 0 },
    { position: [1.2, 0.9, -0.4] as [number, number, number], color: '#00CFE8', size: 0.055, speed: 1.1, offset: 1.2 },
    { position: [-1.1, -0.6, -0.3] as [number, number, number], color: '#FF6B35', size: 0.065, speed: 0.7, offset: 2.4 },
    { position: [1.2, -0.7, -0.5] as [number, number, number], color: '#00E676', size: 0.05, speed: 1.3, offset: 0.8 },
    { position: [0.1, 1.4, -0.6] as [number, number, number], color: '#00B4D8', size: 0.05, speed: 0.8, offset: 3.1 },
    { position: [-0.2, -1.3, -0.4] as [number, number, number], color: '#00E5FF', size: 0.04, speed: 1.5, offset: 1.7 },
  ], []);

  return (
    <group ref={groupRef}>
      {/* Rings — kept well inside frustum: camera z=5.5, fov=48, half-w≈2.35 */}
      <GlowRing radius={1.5} tube={0.01}  color="#00E5FF" speed={0.45}  axis="y" />
      <GlowRing radius={1.2} tube={0.007} color="#0097B2" speed={-0.35} axis="x" />
      <GlowRing radius={1.75} tube={0.006} color="#00CFE8" speed={0.2}  axis="z" />

      {orbs.map((orb, i) => <Orb key={i} {...orb} />)}

      <Float speed={2} rotationIntensity={0.06} floatIntensity={0.45}>
        <MascotMesh />
      </Float>
    </group>
  );
}

// ─── Exported Canvas ──────────────────────────────────────────────────────────

export function MascotCanvas({ width = '100%', height = '100%' }: { width?: number | string; height?: number | string }) {
  return (
    <div style={{ width, height, filter: 'drop-shadow(0 0 28px rgba(0,229,255,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 48 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <ambientLight intensity={1} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

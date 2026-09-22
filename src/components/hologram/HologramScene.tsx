/**
 * HologramScene.tsx
 * Full hologram scene: Canvas → face + torus rings + particle cloud + post-processing.
 */

import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Scanline } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AIState, RadarReading } from '../../types';
import { HologramFace } from './HologramFace';

// ─── Torus ring config ────────────────────────────────────────────────────────
const RINGS = [
  { y: -0.9, radius: 1.10, speed: 0.18, rotAxis: new THREE.Vector3(1, 0.3, 0) },
  { y: -0.9, radius: 1.45, speed: 0.12, rotAxis: new THREE.Vector3(0.4, 1, 0.2) },
  { y: -0.9, radius: 1.80, speed: 0.08, rotAxis: new THREE.Vector3(0.2, 0.5, 1) },
];

function TorusRings({ presence }: { presence: boolean }) {
  const refs = [
    useRef<THREE.Mesh>(null!),
    useRef<THREE.Mesh>(null!),
    useRef<THREE.Mesh>(null!),
  ];

  const targetColor = useMemo(() => new THREE.Color(presence ? '#00ff88' : '#1a6fff'), [presence]);
  const materialRefs = [
    useRef<THREE.MeshBasicMaterial>(null!),
    useRef<THREE.MeshBasicMaterial>(null!),
    useRef<THREE.MeshBasicMaterial>(null!),
  ];

  useFrame((_, delta) => {
    RINGS.forEach((cfg, i) => {
      const mesh = refs[i].current;
      if (!mesh) return;
      mesh.rotateOnAxis(cfg.rotAxis.clone().normalize(), cfg.speed * delta);
      
      const mat = materialRefs[i].current;
      if (mat) {
        mat.color.lerp(targetColor, 0.05);
        const targetOpacity = presence ? 1.0 : 0.65;
        mat.opacity += (targetOpacity - mat.opacity) * 0.05;
      }
    });
  });

  return (
    <>
      {RINGS.map((cfg, i) => (
        <mesh key={i} ref={refs[i]} position={[0, cfg.y, 0]}>
          <torusGeometry args={[cfg.radius, 0.004, 8, 96]} />
          <meshBasicMaterial
            ref={materialRefs[i]}
            color="#1a6fff"
            transparent
            opacity={0.65}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  );
}

// ─── Ambient particle cloud ───────────────────────────────────────────────────
const PARTICLE_COUNT = 800;

function AmbientParticles({ motion }: { motion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.PointsMaterial>(null!);

  // Generate random positions on a sphere shell
  const { positions, speeds } = useMemo(() => {
    const pos    = new Float32Array(PARTICLE_COUNT * 3);
    const spd    = new Float32Array(PARTICLE_COUNT);
    const tmp    = new THREE.Vector3();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r     = 1.6 + Math.random() * 0.7; // shell thickness 0.7
      tmp.setFromSphericalCoords(r, Math.acos(2 * Math.random() - 1), Math.random() * Math.PI * 2);
      pos[i * 3]     = tmp.x;
      pos[i * 3 + 1] = tmp.y;
      pos[i * 3 + 2] = tmp.z;
      spd[i] = 0.08 + Math.random() * 0.18;
    }
    return { positions: pos, speeds: spd };
  }, []);

  const targetColor = useMemo(() => new THREE.Color(motion ? '#ffaa00' : '#3399ff'), [motion]);

  useFrame(({ clock }) => {
    const pts = pointsRef.current;
    if (pts) {
      const speedMultiplier = motion ? 2.5 : 1.0;
      pts.rotation.y = clock.getElapsedTime() * 0.04 * speedMultiplier;
      pts.rotation.x = Math.sin(clock.getElapsedTime() * 0.015) * 0.08 * speedMultiplier;
    }

    if (materialRef.current) {
      materialRef.current.color.lerp(targetColor, 0.05);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.012}
        color="#3399ff"
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Fallback while GLB loads ─────────────────────────────────────────────────
function HologramFallback() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });
  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[0.6, 1]} />
      <meshBasicMaterial
        wireframe
        color="#FFFFFF"
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface HologramSceneProps {
  state: AIState;
  isSpeaking: boolean;
  radarData?: RadarReading | null;
  micVolume?: number;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function HologramScene({ state, isSpeaking, radarData, micVolume }: HologramSceneProps) {
  const presence = radarData?.presence ?? false;
  const motion = radarData?.motion ?? false;
  const bloomIntensity = presence ? 2.0 : 1.4;

  return (
    <div style={{ width: '100%', height: '100%', background: 'transparent', position: 'relative' }}>
      
      {/* ── HTML Radar Overlay HUD ── */}
      {radarData && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 font-mono text-xs pointer-events-none">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded text-white/90">
            <span className="text-gray-400">SENSOR:</span>
            <span className="text-cyan-400">{radarData.sensorId}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded">
            {presence ? (
              <span className="text-green-400 animate-pulse font-bold">🟢 PRESENCE DETECTED</span>
            ) : (
              <span className="text-gray-400">⭕ CLEAR</span>
            )}
          </div>
          {(radarData.breathingRate !== null || motion) && (
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded text-white/80">
              {radarData.breathingRate !== null && (
                <span className="flex items-center gap-1">
                  🫁 {radarData.breathingRate} <span className="text-gray-500 text-[10px]">BPM</span>
                </span>
              )}
              {motion && (
                <span className="text-amber-400 font-bold ml-auto animate-pulse text-[10px] uppercase tracking-wider">
                  ⚡ Motion
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1 px-1">
            <div className="flex gap-[2px]">
              {[1, 2, 3, 4, 5].map(bar => (
                <div 
                  key={bar} 
                  className={`w-1 h-2 rounded-sm ${bar * 20 <= radarData.signalStrength ? 'bg-cyan-500' : 'bg-white/10'}`} 
                />
              ))}
            </div>
            <span className="text-[9px] text-gray-500 ml-1">SIG</span>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0.2, 3.2], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
      {/* Minimal ambient so wireframe depth is visible */}
      <ambientLight intensity={0.05} />

      {/* Hologram face with morph targets */}
      <Suspense fallback={<HologramFallback />}>
        <HologramFace state={state} isSpeaking={isSpeaking} micVolume={micVolume} />
      </Suspense>

      {/* Orbiting torus rings */}
      <TorusRings presence={presence} />

      {/* Ambient particle cloud */}
      <AmbientParticles motion={motion} />

      {/* Post-processing: bloom glow + scanlines */}
      <EffectComposer>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <Scanline density={0.08} opacity={0.25} />
      </EffectComposer>
      </Canvas>
    </div>
  );
}

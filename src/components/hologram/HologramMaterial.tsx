/**
 * HologramMaterial.tsx
 * Wireframe hologram material with state-driven color and pulsing opacity.
 * depthTest:false + DoubleSide ensures the wireframe is fully visible
 * without the dark mesh silhouette blocking the hologram effect.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AIState } from '../../types';

// ─── State → color map ────────────────────────────────────────────────────────
const STATE_COLORS: Record<string, string> = {
  IDLE:          '#F2A900',
  LISTENING:     '#00e5ff',
  THINKING:      '#0066ff',
  PROCESSING:    '#0066ff',
  EXECUTING:     '#0066ff',
  SPEAKING:      '#00bfff',
  ERROR:         '#ff2244',
  AUTHORIZATION: '#F2A900',
  RECOVERING:    '#F2A900',
};

// ─── State → pulse frequency (Hz) ────────────────────────────────────────────
const STATE_PULSE_FREQ: Record<string, number> = {
  IDLE:          0.6,
  LISTENING:     1.2,
  THINKING:      0.9,
  PROCESSING:    1.0,
  EXECUTING:     1.0,
  SPEAKING:      2.2,
  ERROR:         3.0,
  AUTHORIZATION: 0.8,
  RECOVERING:    1.5,
};

// ─── State → base opacity ─────────────────────────────────────────────────────
const STATE_BASE_OPACITY: Record<string, number> = {
  IDLE:          0.62,
  LISTENING:     0.75,
  THINKING:      0.68,
  PROCESSING:    0.68,
  EXECUTING:     0.68,
  SPEAKING:      0.82,
  ERROR:         0.88,
  AUTHORIZATION: 0.60,
  RECOVERING:    0.60,
};

interface HologramMaterialProps {
  state: AIState;
}

/**
 * Returns a ref to a THREE.MeshBasicMaterial configured for hologram rendering.
 * Material is created imperatively so depthTest + blending are applied correctly.
 */
export function useHologramMaterial(state: AIState) {
  const matRef       = useRef<THREE.MeshBasicMaterial>(null!);
  const currentColor = useRef(new THREE.Color(STATE_COLORS[state] ?? '#F2A900'));
  const targetColor  = useRef(new THREE.Color(STATE_COLORS[state] ?? '#F2A900'));

  // Create material imperatively once so all flags (depthTest, side, blending) stick
  useEffect(() => {
    const mat = new THREE.MeshBasicMaterial({
      wireframe:   true,
      transparent: true,
      depthWrite:  false,
      depthTest:   true,          // true so it respects depth
      side:        THREE.FrontSide, // FrontSide prevents backface wireframe noise
      blending:    THREE.AdditiveBlending,
      color:       new THREE.Color(STATE_COLORS[state] ?? '#F2A900'),
      opacity:     STATE_BASE_OPACITY[state] ?? 0.62,
    });
    matRef.current = mat;
    return () => mat.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // one-time — color/opacity animated in useFrame below

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;

    const stateKey  = state ?? 'IDLE';
    const targetHex = STATE_COLORS[stateKey] ?? '#F2A900';
    targetColor.current.set(targetHex);

    // Smooth lerp toward target color
    currentColor.current.lerp(targetColor.current, 0.06);
    mat.color.copy(currentColor.current);

    // Pulsing opacity
    const freq        = STATE_PULSE_FREQ[stateKey] ?? 0.8;
    const baseOpacity = STATE_BASE_OPACITY[stateKey] ?? 0.62;
    const pulse       = Math.sin(clock.getElapsedTime() * freq * Math.PI * 2) * 0.15;
    mat.opacity = THREE.MathUtils.clamp(baseOpacity + pulse, 0.1, 1.0);
  });

  return matRef;
}

/**
 * Drop-in JSX material element for use on individual meshes.
 */
export function HologramMaterialImpl({ state }: HologramMaterialProps) {
  const matRef = useHologramMaterial(state);

  return (
    <meshBasicMaterial
      ref={matRef}
      wireframe
      transparent
      depthWrite={false}
      depthTest={true}
      side={THREE.FrontSide}
      blending={THREE.AdditiveBlending}
      color={STATE_COLORS[state] ?? '#F2A900'}
      opacity={STATE_BASE_OPACITY[state] ?? 0.62}
    />
  );
}

/**
 * HologramFace.tsx
 * Loads head.glb and renders it with hologram wireframe material.
 * Drives human motion: breathing idle, pointer parallax, blinking, lip-sync.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AIState } from '../../types';
import { useHologramMaterial } from './HologramMaterial';

// ─── Lip-sync viseme cycle config ─────────────────────────────────────────────
const VISEME_PRIORITY = [
  'viseme_aa', 'viseme_E', 'viseme_O', 'viseme_U', 'viseme_I',
  'viseme_FF', 'viseme_TH', 'viseme_PP',
  'jawOpen', 'mouthFunnel', 'mouthPucker', 'mouthSmile_L', 'mouthSmile_R',
];

const BLINK_TARGETS = ['eyeBlinkLeft', 'eyeBlinkRight'];

// ─── Custom GLTFLoader factory ────────────────────────────────────────────────
function createConfiguredGLTFLoader(gl: THREE.WebGLRenderer): GLTFLoader {
  const loader = new GLTFLoader();

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/basis/');
  ktx2Loader.detectSupport(gl);
  loader.setKTX2Loader(ktx2Loader);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  loader.setDRACOLoader(dracoLoader);

  loader.setMeshoptDecoder(MeshoptDecoder);

  return loader;
}

interface HologramFaceProps {
  state: AIState;
  isSpeaking: boolean;
  micVolume?: number;
}

export function HologramFace({ state, isSpeaking, micVolume = 0 }: HologramFaceProps) {
  const { gl } = useThree();

  const gltf = useLoader(GLTFLoader, '/models/head.glb', (l) => {
    const gl2 = gl;
    const ktx2 = new KTX2Loader();
    ktx2.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/basis/');
    ktx2.detectSupport(gl2);
    (l as unknown as GLTFLoader).setKTX2Loader(ktx2);

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    (l as unknown as GLTFLoader).setDRACOLoader(draco);

    (l as unknown as GLTFLoader).setMeshoptDecoder(MeshoptDecoder);
  }) as GLTF;

  const groupRef    = useRef<THREE.Group>(null!);
  const matRef      = useHologramMaterial(state);

  const mouse       = useRef({ x: 0, y: 0 });
  const smoothMouse = useRef({ x: 0, y: 0 });
  const nextBlink   = useRef(performance.now() + 4000);
  const blinkStart  = useRef<number | null>(null);
  const BLINK_DUR   = 120;
  const speakPhase  = useRef(0);
  const speakIdx    = useRef(0);

  const meshes = useMemo(() => {
    const result: THREE.SkinnedMesh[] = [];
    gltf.scene.traverse((obj) => {
      if ((obj as THREE.SkinnedMesh).isMesh) result.push(obj as THREE.SkinnedMesh);
    });
    return result;
  }, [gltf.scene]);

  const morphDict = useMemo<Record<string, number>>(() => {
    for (const m of meshes) {
      if (m.morphTargetDictionary && Object.keys(m.morphTargetDictionary).length > 0) {
        return m.morphTargetDictionary as Record<string, number>;
      }
    }
    return {};
  }, [meshes]);

  const availableLipTargets = useMemo(
    () => VISEME_PRIORITY.filter((k) => k in morphDict),
    [morphDict]
  );

  const availableBlinkTargets = useMemo(
    () => BLINK_TARGETS.filter((k) => k in morphDict),
    [morphDict]
  );

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    
    for (const m of meshes) {
      // If it has jawOpen, it's the main face.
      const isFace = m.morphTargetDictionary && 'jawOpen' in m.morphTargetDictionary;
      
      if (isFace) {
        m.material = mat;
        m.visible = true;
      } else {
        // Hide eyes and teeth to prevent dense glowing blobs
        m.visible = false;
      }
    }
  }, [meshes, matRef]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const setMorph = (key: string, value: number) => {
    if (!(key in morphDict)) return;
    const idx = morphDict[key];
    for (const m of meshes) {
      if (m.morphTargetInfluences && idx < m.morphTargetInfluences.length) {
        m.morphTargetInfluences[idx] = value;
      }
    }
  };

  useFrame(({ clock }) => {
    const t   = clock.getElapsedTime();
    const now = performance.now();
    const grp = groupRef.current;
    if (!grp) return;

    smoothMouse.current.x += (mouse.current.x - smoothMouse.current.x) * 0.04;
    smoothMouse.current.y += (mouse.current.y - smoothMouse.current.y) * 0.04;
    const mx = smoothMouse.current.x;
    const my = smoothMouse.current.y;

    grp.position.y = Math.sin(t * 1.1) * 0.008;
    const swayY    = Math.sin(t * 0.4) * 0.015;
    const swayZ    = Math.cos(t * 0.3) * 0.008;
    const thinkTilt = state === 'THINKING' ? -0.18 : 0;

    grp.rotation.y = mx * 0.25 + swayY;
    grp.rotation.x = -my * 0.15 + thinkTilt;
    grp.rotation.z = swayZ;

    if (now >= nextBlink.current && blinkStart.current === null) {
      blinkStart.current = now;
      nextBlink.current  = now + BLINK_DUR + 3500 + Math.random() * 2000;
    }
    if (blinkStart.current !== null) {
      const progress = (now - blinkStart.current) / BLINK_DUR;
      const blink    = Math.sin(Math.PI * Math.min(progress, 1.0));
      for (const key of availableBlinkTargets) setMorph(key, blink);
      if (progress >= 1.0) {
        blinkStart.current = null;
        for (const key of availableBlinkTargets) setMorph(key, 0);
      }
    }

    // Lip Sync (Live Voice Streaming or TTS)
    if (micVolume > 0.01) {
      // Live Voice mode: scale volume up to drive morph target
      const targetVolume = Math.min(micVolume * 3, 1.0);
      for (const k of availableLipTargets) setMorph(k, 0);
      
      // Basic visualization: open jaw and mouth based on amplitude
      setMorph('jawOpen', targetVolume * 0.8);
      setMorph('mouthFunnel', targetVolume * 0.6);
      setMorph('viseme_O', targetVolume * 0.5);
    } else if (isSpeaking && state === 'SPEAKING' && availableLipTargets.length > 0) {
      // Standard TTS simulated mode
      speakPhase.current += 0.08;
      if (speakPhase.current > 1) {
        speakPhase.current = 0;
        speakIdx.current = (speakIdx.current + 1) % availableLipTargets.length;
      }
      const val = Math.abs(Math.sin(speakPhase.current * Math.PI));
      for (const k of availableLipTargets) setMorph(k, 0);
      setMorph(availableLipTargets[speakIdx.current], val * 0.7);
    } else {
      for (const k of availableLipTargets) setMorph(k, 0);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={gltf.scene} scale={1.0} />
    </group>
  );
}

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AIState } from '../types';

interface AICore3DProps {
  state: AIState;
  onGlitchEnd?: () => void;
}

/**
 * Procedural circular particle glow texture with high-intensity falloff
 */
function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 215, 0, 0.95)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * State visual configurations for the JARVIS-style Holographic Core
 */
const STATE_THEMES: Record<
  AIState,
  {
    coreColor: number;
    wireColor: number;
    ringColor: number;
    glowColor: number;
    particleColor: number;
    lightIntensity: number;
    rotationSpeed: number;
    pulseFrequency: number;
    expansionRate: number;
    shieldOpacity: number;
    scanActive: boolean;
  }
> = {
  IDLE: {
    coreColor: 0xffaa00,
    wireColor: 0xffb700,
    ringColor: 0xffffff,
    glowColor: 0xff8c00,
    particleColor: 0xffffff,
    lightIntensity: 2.2,
    rotationSpeed: 0.65,
    pulseFrequency: 1.2,
    expansionRate: 1.0,
    shieldOpacity: 0.15,
    scanActive: false,
  },
  LISTENING: {
    coreColor: 0x00f0ff,
    wireColor: 0x38bdf8,
    ringColor: 0x00e5ff,
    glowColor: 0x0284c7,
    particleColor: 0x00f0ff,
    lightIntensity: 3.2,
    rotationSpeed: 1.4,
    pulseFrequency: 3.2,
    expansionRate: 1.15,
    shieldOpacity: 0.35,
    scanActive: false,
  },
  THINKING: {
    coreColor: 0x38bdf8,
    wireColor: 0x818cf8,
    ringColor: 0x0ea5e9,
    glowColor: 0x2563eb,
    particleColor: 0x38bdf8,
    lightIntensity: 3.5,
    rotationSpeed: 2.2,
    pulseFrequency: 4.8,
    expansionRate: 1.25,
    shieldOpacity: 0.4,
    scanActive: false,
  },
  PROCESSING: {
    coreColor: 0x00f5ff,
    wireColor: 0x00d2ff,
    ringColor: 0x00e5ff,
    glowColor: 0x00a8ff,
    particleColor: 0x00f5ff,
    lightIntensity: 3.8,
    rotationSpeed: 2.6,
    pulseFrequency: 5.5,
    expansionRate: 1.2,
    shieldOpacity: 0.5,
    scanActive: true,
  },
  EXECUTING: {
    coreColor: 0x00f0ff,
    wireColor: 0x22d3ee,
    ringColor: 0xffffff,
    glowColor: 0x0284c7,
    particleColor: 0x00e5ff,
    lightIntensity: 4.0,
    rotationSpeed: 3.2,
    pulseFrequency: 6.0,
    expansionRate: 1.3,
    shieldOpacity: 0.6,
    scanActive: true,
  },
  AUTHORIZATION: {
    coreColor: 0xf59e0b,
    wireColor: 0xd97706,
    ringColor: 0xb45309,
    glowColor: 0x78350f,
    particleColor: 0xf59e0b,
    lightIntensity: 3.6,
    rotationSpeed: 1.0,
    pulseFrequency: 2.0,
    expansionRate: 1.1,
    shieldOpacity: 0.75,
    scanActive: false,
  },
  SPEAKING: {
    coreColor: 0xffcc00,
    wireColor: 0xffdd44,
    ringColor: 0xffaa00,
    glowColor: 0xff8800,
    particleColor: 0xffd700,
    lightIntensity: 3.6,
    rotationSpeed: 1.8,
    pulseFrequency: 4.0,
    expansionRate: 1.22,
    shieldOpacity: 0.35,
    scanActive: false,
  },
  ERROR: {
    coreColor: 0xef4444,
    wireColor: 0xf87171,
    ringColor: 0xdc2626,
    glowColor: 0x991b1b,
    particleColor: 0xef4444,
    lightIntensity: 4.5,
    rotationSpeed: 4.0,
    pulseFrequency: 8.0,
    expansionRate: 1.35,
    shieldOpacity: 0.8,
    scanActive: true,
  },
  RECOVERING: {
    coreColor: 0xf97316,
    wireColor: 0xfb923c,
    ringColor: 0xea580c,
    glowColor: 0xc2410c,
    particleColor: 0xf97316,
    lightIntensity: 3.8,
    rotationSpeed: 2.4,
    pulseFrequency: 4.2,
    expansionRate: 1.25,
    shieldOpacity: 0.6,
    scanActive: true,
  },
};

export const AICore3D: React.FC<AICore3DProps> = ({ state, onGlitchEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AIState>(state);
  stateRef.current = state;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.015);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0, 22);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // --- 2. Master Core Group ---
    const coreMasterGroup = new THREE.Group();
    scene.add(coreMasterGroup);

    // --- 3. Central Glowing Holographic Singularity & Inner Nested Spheres ---
    // A. Inner high-intensity emissive core sphere
    const innerCoreGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffc72c,
      wireframe: false,
      transparent: true,
      opacity: 0.9,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    coreMasterGroup.add(innerCoreMesh);

    // B. Middle Icosahedron Holographic Lattice
    const latticeGeo = new THREE.IcosahedronGeometry(2.3, 2);
    const latticeMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    coreMasterGroup.add(latticeMesh);

    // C. Outer Wireframe Energy Cage
    const outerCageGeo = new THREE.IcosahedronGeometry(2.9, 1);
    const outerCageMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const outerCageMesh = new THREE.Mesh(outerCageGeo, outerCageMat);
    coreMasterGroup.add(outerCageMesh);

    // D. Soft Optical Glow Corona
    const glowGeo = new THREE.SphereGeometry(3.4, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    coreMasterGroup.add(glowMesh);

    // --- 4. Rotating Holographic Data Rings & Orbital Gyroscopes ---
    const ringsGroup = new THREE.Group();
    coreMasterGroup.add(ringsGroup);

    // Ring 1: Primary Equator Ring with calibrated ticks
    const ring1Geo = new THREE.RingGeometry(4.2, 4.4, 80);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI * 0.5;
    ringsGroup.add(ring1);

    // Ring 2: Tilted Orbital Ring
    const ring2Geo = new THREE.RingGeometry(4.9, 5.08, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xffbb00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI * 0.35;
    ring2.rotation.y = Math.PI * 0.2;
    ringsGroup.add(ring2);

    // Ring 3: Polar Longitudinal Ring
    const ring3Geo = new THREE.RingGeometry(5.6, 5.76, 64);
    const ring3Mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.y = Math.PI * 0.5;
    ringsGroup.add(ring3);

    // Ring 4: Segmented Outer Navigational Ring
    const ring4Geo = new THREE.RingGeometry(6.6, 6.75, 48);
    const ring4Mat = new THREE.MeshBasicMaterial({
      color: 0xff9900,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
      blending: THREE.AdditiveBlending,
    });
    const ring4 = new THREE.Mesh(ring4Geo, ring4Mat);
    ring4.rotation.x = -Math.PI * 0.25;
    ring4.rotation.z = Math.PI * 0.15;
    ringsGroup.add(ring4);

    // Ring 5: Large Perimeter Tactical Data Ring
    const ring5Geo = new THREE.RingGeometry(7.8, 7.92, 96);
    const ring5Mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const ring5 = new THREE.Mesh(ring5Geo, ring5Mat);
    ring5.rotation.x = Math.PI * 0.15;
    ringsGroup.add(ring5);

    // --- 5. Holographic Orbital Satellites / Data Markers ---
    const markersGroup = new THREE.Group();
    coreMasterGroup.add(markersGroup);

    const markerGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: false,
    });
    const markerCount = 12;
    const markers: THREE.Mesh[] = [];
    for (let i = 0; i < markerCount; i++) {
      const marker = new THREE.Mesh(markerGeo, markerMat.clone());
      markersGroup.add(marker);
      markers.push(marker);
    }

    // --- 6. 3,200 Holographic Technological Particle Cloud ---
    const particleCount = 3200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    const particleDistances = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Golden spiral and spherical distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      // Layered radius between core (2.0) and outer envelope (10.5)
      const r = 2.2 + Math.pow(Math.random(), 1.5) * 8.0;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      particleDistances[i] = r;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleTexture = createParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.32,
      map: particleTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffffff,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // --- 7. Holographic Laser Scanning Plane (PROCESSING / EXECUTING / ERROR) ---
    const scanGeo = new THREE.PlaneGeometry(16, 0.15);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const scanPlane = new THREE.Mesh(scanGeo, scanMat);
    coreMasterGroup.add(scanPlane);

    // --- 8. Tactical Security Shield Ring (AUTHORIZATION state) ---
    const shieldGeo = new THREE.RingGeometry(8.4, 8.7, 64);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    coreMasterGroup.add(shieldMesh);

    // --- 9. Dynamic Holographic Lighting ---
    const centralPointLight = new THREE.PointLight(0xffffff, 3.0, 35);
    centralPointLight.position.set(0, 0, 0);
    scene.add(centralPointLight);

    const ambientLight = new THREE.AmbientLight(0x1a1202, 1.2);
    scene.add(ambientLight);

    // Subtle front and rim directional lights
    const frontLight = new THREE.DirectionalLight(0xffc72c, 1.5);
    frontLight.position.set(5, 8, 12);
    scene.add(frontLight);

    const backRimLight = new THREE.DirectionalLight(0x00e5ff, 0.8);
    backRimLight.position.set(-5, -6, -10);
    scene.add(backRimLight);

    // --- 10. Pointer Tracking for Interactive Parallax ---
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = normX * 0.45;
      targetRotX = -normY * 0.35;
    };
    window.addEventListener('mousemove', handlePointerMove);

    // --- 11. Resize Observer ---
    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // --- 12. Animation Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let glitchDuration = 0;
    let currentThemeColor = new THREE.Color(0xffffff);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const activeState = stateRef.current;
      const theme = STATE_THEMES[activeState] || STATE_THEMES.IDLE;

      // Handle glitch on ERROR state
      if (activeState === 'ERROR') {
        glitchDuration += delta;
        if (glitchDuration > 0.8 && onGlitchEnd) {
          onGlitchEnd();
        }
      } else {
        glitchDuration = 0;
      }

      // Smooth color transitions
      const targetColor = new THREE.Color(theme.coreColor);
      currentThemeColor.lerp(targetColor, delta * 4);

      // Apply theme colors
      innerCoreMat.color.setHex(0x000000); // Forced black core as requested
      latticeMat.color.copy(new THREE.Color(theme.wireColor));
      outerCageMat.color.copy(new THREE.Color(theme.wireColor));
      glowMat.color.copy(new THREE.Color(theme.glowColor));
      ring1Mat.color.copy(new THREE.Color(theme.ringColor));
      ring2Mat.color.copy(new THREE.Color(theme.ringColor));
      ring3Mat.color.copy(new THREE.Color(theme.ringColor));
      ring4Mat.color.copy(new THREE.Color(theme.ringColor));
      ring5Mat.color.copy(new THREE.Color(theme.ringColor));
      particleMat.color.copy(new THREE.Color(theme.particleColor));
      centralPointLight.color.copy(currentThemeColor);
      centralPointLight.intensity =
        theme.lightIntensity * (1 + 0.15 * Math.sin(time * theme.pulseFrequency));

      // Gentle interactive mouse parallax
      currentRotX += (targetRotX - currentRotX) * delta * 3;
      currentRotY += (targetRotY - currentRotY) * delta * 3;
      coreMasterGroup.rotation.x = currentRotX;
      coreMasterGroup.rotation.y = currentRotY;

      // Pulse breathing expansion
      const pulseScale =
        theme.expansionRate +
        0.06 * Math.sin(time * theme.pulseFrequency) +
        (activeState === 'SPEAKING' ? 0.08 * Math.sin(time * 12) : 0);
      innerCoreMesh.scale.setScalar(pulseScale);
      latticeMesh.scale.setScalar(pulseScale);

      // Core rotation
      const rotSpeed = theme.rotationSpeed;
      innerCoreMesh.rotation.y += delta * rotSpeed * 0.4;
      latticeMesh.rotation.x += delta * rotSpeed * 0.3;
      latticeMesh.rotation.y -= delta * rotSpeed * 0.5;
      outerCageMesh.rotation.y += delta * rotSpeed * 0.25;
      outerCageMesh.rotation.z -= delta * rotSpeed * 0.2;

      // Rings differential orbital rotation
      ring1.rotation.z += delta * rotSpeed * 0.7;
      ring2.rotation.z -= delta * rotSpeed * 0.55;
      ring3.rotation.x += delta * rotSpeed * 0.45;
      ring4.rotation.z += delta * rotSpeed * 0.35;
      ring5.rotation.z -= delta * rotSpeed * 0.25;

      // Update orbital satellites
      for (let i = 0; i < markerCount; i++) {
        const marker = markers[i];
        const angle = time * 0.8 * (i % 2 === 0 ? 1 : -1) + (i / markerCount) * Math.PI * 2;
        const orbitRadius = 4.3 + (i % 3) * 0.6;
        marker.position.set(
          Math.cos(angle) * orbitRadius,
          Math.sin(angle * 0.5) * (1.2 + (i % 2) * 0.5),
          Math.sin(angle) * orbitRadius
        );
        marker.rotation.x += delta * 2;
        marker.rotation.y += delta * 2;
      }

      // Update Particle Cloud (Orbital flow & wave pulsation)
      const positions = particleGeo.attributes.position.array as Float32Array;
      const waveSpeed = 0.5 * rotSpeed;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        let px = positions[idx];
        let py = positions[idx + 1];
        let pz = positions[idx + 2];

        // Slight rotation around Y axis
        const cosY = Math.cos(delta * waveSpeed * 0.3);
        const sinY = Math.sin(delta * waveSpeed * 0.3);
        const newX = px * cosY - pz * sinY;
        const newZ = px * sinY + pz * cosY;

        // Radial subtle breathing flow
        const dist = Math.sqrt(newX * newX + py * py + newZ * newZ);
        const drift = 0.008 * Math.sin(time * 2.0 + dist);

        positions[idx] = newX + (newX / dist) * drift;
        positions[idx + 1] = py + 0.003 * Math.cos(time * 1.5 + px);
        positions[idx + 2] = newZ + (newZ / dist) * drift;
      }
      particleGeo.attributes.position.needsUpdate = true;
      particleSystem.rotation.y += delta * 0.08 * rotSpeed;

      // Laser scan sweep
      if (theme.scanActive) {
        scanMat.opacity = 0.65 + 0.35 * Math.sin(time * 6);
        scanPlane.position.y = Math.sin(time * 3.5) * 3.6;
        scanPlane.rotation.y += delta * 1.5;
      } else {
        scanMat.opacity = 0;
      }

      // Authorization Shield
      if (activeState === 'AUTHORIZATION') {
        shieldMat.opacity = theme.shieldOpacity * (0.85 + 0.15 * Math.sin(time * 4));
        shieldMesh.rotation.z += delta * 0.8;
      } else {
        shieldMat.opacity = 0;
      }

      // Jitter on ERROR
      if (activeState === 'ERROR') {
        coreMasterGroup.position.x = (Math.random() - 0.5) * 0.25;
        coreMasterGroup.position.y = (Math.random() - 0.5) * 0.25;
      } else {
        coreMasterGroup.position.set(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- 13. Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      resizeObserver.disconnect();

      renderer.dispose();
      particleTexture.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      latticeGeo.dispose();
      latticeMat.dispose();
      outerCageGeo.dispose();
      outerCageMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      ring4Geo.dispose();
      ring4Mat.dispose();
      ring5Geo.dispose();
      ring5Mat.dispose();
      markerGeo.dispose();
      markerMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      scanGeo.dispose();
      scanMat.dispose();
      shieldGeo.dispose();
      shieldMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onGlitchEnd]);

  return (
    <div
      ref={containerRef}
      id="ai-central-core-viewport"
      className="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-auto"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.08) 0%, rgba(5, 5, 5, 0.95) 100%)',
      }}
    />
  );
};

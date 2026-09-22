# Visual Design System & Tactical HUD Specification
## Super AI — Holographic Interface Architecture

**Document Version**: 2.0  
**Status**: Frozen Production System  
**Design Paradigm**: High-Tech Holographic Tactical Command Cockpit (JARVIS Aesthetic)  

---

## 1. Design Philosophy & Vision

Super AI is engineered to deliver the sensation of standing inside a futuristic tactical operations console. Every visual element has an explicit functional purpose:

1. **Spatial Depth & Realism**: Layered glassmorphic surfaces, subtle dynamic glows, and 3D WebGL particle fields create a tactile sense of physical space.
2. **Real-Time State Transparency**: The AI's internal state is never opaque. Color shifts, particle velocity changes, and orbital ring frequencies provide instantaneous visual status.
3. **Tactical Precision**: High-contrast typography, monospace telemetry readouts, ultra-thin border accents, and sharp geometry eliminate consumer chat fluff in favor of an authoritative workstation.
4. **Urgency & Life**: Subtle ambient pulses and breathing animations convey continuous awareness even in idle states.

> *"Design for the sensation of standing inside the future."*

---

## 2. Dynamic 9-State Color Engine

Each operational state of Super AI has a dedicated chromatic signature that governs the 3D Hologram, HUD borders, status pills, and glow envelopes:

| AI State | Signature Name | HSL Color | Hex | Particle Behavior | UI State Description |
|---|---|---|---|---|---|
| **`IDLE`** | Amber Solar | `hsl(40, 90%, 55%)` | `#F59E0B` | Slow ambient orbital drift (0.2x speed) | Default resting state; system awaiting user input or presence. |
| **`LISTENING`** | Acoustic Cyan | `hsl(185, 100%, 50%)` | `#00F0FF` | Audio-reactive waveform modulation | Microphone active; Web Speech / audio stream listening. |
| **`THINKING`** | Neural Blue | `hsl(220, 100%, 60%)` | `#3377FF` | High-frequency inner core oscillation | LLM inference in progress; token stream parsing. |
| **`PROCESSING`** | Scan Cyan | `hsl(195, 100%, 55%)` | `#1AD1FF` | Planar laser scanning sweep across Y-axis | Tool execution, web search, or database query active. |
| **`EXECUTING`** | Surge Green | `hsl(150, 100%, 50%)` | `#00FF7F` | High-speed outward particle acceleration | Autonomous multi-step task running; sub-agents operating. |
| **`SPEAKING`** | Harmonic Violet | `hsl(270, 80%, 65%)` | `#A855F7` | Harmonic acoustic pulse radiating outward | Text-to-speech audio streaming through speakers. |
| **`AUTHORIZATION`**| Security Amber | `hsl(45, 100%, 50%)` | `#FFB703` | Locked rings with pulsating protective barrier | Dangerous tool paused waiting for operator approval. |
| **`ERROR`** | Flux Red | `hsl(0, 100%, 55%)` | `#EF4444` | Chaotic Brownian jitter and chromatic aberration | Uncaught error, tool failure, or rate limit hit. |
| **`RECOVERING`** | Healing Teal | `hsl(170, 80%, 50%)` | `#14B8A6` | Clockwise harmonic convergence spin | Self-healing observer attempting fallback / retry loop. |

---

## 3. Base Color & Surface System

### 3.1 Surface Tokens (`tokens.css`)

```css
/* Backgrounds */
--bg-void:          #050505;                       /* Deepest near-black void canvas */
--bg-panel:         rgba(5, 5, 5, 0.85);           /* HUD panel background */
--bg-surface:       rgba(255, 255, 255, 0.04);     /* Glass card surface */
--bg-surface-hover: rgba(255, 255, 255, 0.08);     /* Interactive hover surface */
--bg-elevated:      rgba(255, 255, 255, 0.12);     /* Elevated UI items */

/* Tactical Borders */
--border-dim:       rgba(255, 255, 255, 0.10);     /* Hairline background division */
--border-default:   rgba(255, 255, 255, 0.25);     /* Standard card/panel border */
--border-active:    rgba(255, 255, 255, 0.65);     /* Focused input or active tab */

/* Text Hierarchy */
--text-primary:     #FFFFFF;                       /* 100% white primary text */
--text-secondary:   rgba(255, 255, 255, 0.70);     /* 70% secondary technical text */
--text-muted:       rgba(255, 255, 255, 0.40);     /* 40% micro labels and timestamps */
--text-accent:      #22D3EE;                       /* Cyan monospace telemetry text */
```

### 3.2 Glow & Elevation System

```css
/* Monochromatic Glows */
--glow-sm:    0 0 8px rgba(255, 255, 255, 0.25);
--glow-md:    0 0 16px rgba(255, 255, 255, 0.35);
--glow-lg:    0 0 32px rgba(255, 255, 255, 0.45);
--glow-pulse: 0 0 20px rgba(255, 255, 255, 0.60);

/* Semantic Glows */
--glow-cyan:  0 0 16px rgba(34, 211, 238, 0.40);
--glow-green: 0 0 16px rgba(34, 197, 94, 0.40);
--glow-amber: 0 0 16px rgba(245, 158, 11, 0.40);
--glow-error: 0 0 16px rgba(239, 68, 68, 0.45);
```

---

## 4. Typography & Font Hierarchy

### 4.1 Font Stack
- **Primary Interface**: `'Outfit', 'Inter', system-ui, sans-serif`
- **Monospace Telemetry**: `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`

### 4.2 Type Scale (16px Root Grid)

| Token | Size | Tracking | Usage |
|---|---|---|---|
| `xs` | 0.625rem (10px) | `tracking-widest` (0.1em) | HUD telemetry badges, timestamps, status pills |
| `sm` | 0.75rem (12px) | `tracking-wider` (0.05em) | Secondary captions, sub-step details |
| `base`| 0.875rem (14px) | `normal` | Dialogue text, activity logs, markdown body |
| `md` | 1.0rem (16px) | `tracking-normal` | Interactive buttons, section headers |
| `lg` | 1.125rem (18px) | `tracking-tight` (-0.025em)| Card titles, modal headers |
| `xl` | 1.25rem (20px) | `tracking-tight` | Control panel tab headers |
| `2xl`| 1.5rem (24px) | `tracking-tight` | Feature banner titles |
| `display` | 2.5rem+ (40px+) | `tracking-tighter` (-0.05em) | "SUPER AI" holographic branding header |

---

## 5. Spacing, Grid & Layout Rules

### 5.1 8-Pixel Layout Grid

```text
space-1:  4px   (Micro padding, icon alignment)
space-2:  8px   (Component internal gap)
space-3:  12px  (Tight badge/button padding)
space-4:  16px  (Default card padding)
space-5:  20px  (Section spacing)
space-6:  24px  (Panel gutters)
space-8:  32px  (Major module separation)
space-12: 48px  (Viewport header/footer offset)
```

### 5.2 Viewport Layout Grid
- **Main Chat & Activity Column**: Centered with `max-w-4xl` (896px).
- **Side Telemetry Sidebar**: Fixed 280px width (collapsible to 48px icon rail).
- **Top Navigation Bar**: Fixed height 56px (`h-14`), sticky top with blur backdrop.
- **Chat Input Bar**: Sticky bottom, floating card with `backdrop-blur-xl`.
- **Z-Index Ladder**:
  - `z-0`: Three.js WebGL canvas background
  - `z-10`: Interactive HUD layout panels and activity feed
  - `z-20`: Top Navigation Bar and floating telemetry badges
  - `z-50`: Modals (Control Panel, Tool Authorization, Memory Explorer)
  - `z-100`: Toast notifications and critical system error alerts

---

## 6. 3D WebGL Hologram Singularity Specifications

### 6.1 Geometric Constructs (`AICore3D.tsx`)
1. **Emissive Inner Singularity Core**:
   - `SphereGeometry(1.6, 32, 32)`
   - Material: `MeshBasicMaterial` with color driven by active `AIState`
   - Dynamically scales between `0.95` and `1.25` via sine-wave breathing formula:
     $$\text{scale} = 1.0 + \sin(\text{time} \cdot 3.0) \cdot 0.15 \cdot \text{pulseIntensity}$$
2. **Dual Nested Icosahedron Lattices**:
   - Inner Lattice: `IcosahedronGeometry(2.4, 1)` wireframe.
   - Outer Lattice: `IcosahedronGeometry(3.2, 2)` wireframe with 40% opacity.
   - Counter-rotates relative to the inner core to produce a moiré quantum interference pattern.
3. **5 Differential Orbital Gyroscope Rings**:
   - Constructed with `TorusGeometry(radius, 0.025, 16, 100)`.
   - Ring 1 (Radius 4.2): Pitch tilt $15^\circ$, speed $+1.0$.
   - Ring 2 (Radius 5.1): Yaw tilt $-30^\circ$, speed $-0.8$.
   - Ring 3 (Radius 6.0): Roll tilt $45^\circ$, speed $+1.2$.
   - Ring 4 (Radius 7.2): Oblique tilt $70^\circ$, speed $-1.5$.
   - Ring 5 (Radius 8.5): Equatorial planar outer ring, speed $+0.6$.
4. **3,200 Reactive Vector Particles**:
   - Managed in a single `BufferGeometry` with `Float32Array(3200 * 3)` positions.
   - Particle velocity vectors expand outward during `EXECUTING` and converge inward during `THINKING`.
   - Uses `AdditiveBlending` to eliminate harsh particle clipping.

### 6.2 Facial Hologram Scene (`HologramScene.tsx`)
- Toggled via the HUD core switcher.
- Renders a 3D procedural wireframe human/cybernetic face mesh with horizontal scanlines and depth-based fresnel glow.

---

## 7. Component UI Standards (Frozen Rules)

### 7.1 Buttons
- **Default Style**: White outline (`border border-white/20 text-white bg-white/5 hover:bg-white/15 hover:border-white/60 active:scale-95`).
- **Primary Action (CTA)**: High-contrast white fill with dark void text (`bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.4)]`).
- **Disabled State**: `opacity-40 cursor-not-allowed pointer-events-none`.

### 7.2 Cards & Modals
- **Surface**: `bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl`.
- **Header**: Monospace category label in uppercase tracking-widest, followed by a thin horizontal border (`border-b border-white/10`).

### 7.3 Status Pills
- **Style**: `inline-flex items-center gap-2 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold tracking-widest uppercase`.
- **Indicator**: Left dot `w-1.5 h-1.5 rounded-full` pulsating with CSS `animate-pulse`.

### 7.4 Input Controls
- **Style**: `bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-white/65 focus:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all`.

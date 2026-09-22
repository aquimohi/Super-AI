# Product Requirements Document (PRD)
## Super AI — Holographic Intelligence Command Platform

**Document Version**: 2.0  
**Status**: Active Production  
**Owner**: Mohit Kumar  
**Target Platform**: Web & Local Desktop Command Center (Node.js v20+, React 19, Three.js)  

---

## 1. Executive Summary & Vision

**Super AI** is a futuristic, holographic personal AI assistant and command center engineered for power users, developers, and hardware enthusiasts. Moving far beyond traditional flat, static chat windows, Super AI provides a transparent, reactive command interface inspired by tactical military consoles and JARVIS-like personal intelligence systems.

Super AI fuses:
1. **Visual State Spatial Awareness**: A real-time 3D WebGL holographic core that physically responds to system states, cognitive loads, and audio frequencies.
2. **Multi-Model Cognitive Orchestration**: Dynamic task routing across specialized LLM roles (general, reasoning, coding, vision, judge) powered by Google Gemini and OpenRouter.
3. **Autonomous Multi-Agent Swarm**: Parallel task decomposition and execution across specialized agents (`HEAD`, `CODER`, `SCRAPER`, `TESTER`), coupled with a strict Design Genius pipeline (`DESIGNER`, `COPY_EDITOR`, and humanizer).
4. **Physical & Desktop Automation**: Deep local integration with Windows Computer Control, sandboxed Puppeteer browser automation, and physical IoT sensors (mmWave radar telemetry and smart gates).
5. **Hierarchical Memory**: Multi-layered persistent context spanning working session scratchpads, short-term conversational windows, long-term structured facts, and tokenized design memory.

---

## 2. Problem Statement

Current AI assistants suffer from fundamental design limitations:
- **Spatial Blindness & Opacity**: Users are left waiting at an empty text box with a generic spinning indicator. Internal cognitive steps, tool calls, and error recoveries remain hidden.
- **Single-Model Vendor Lock-in**: Users are forced to rely on a single model for heterogeneous tasks (coding, creative writing, fast search, logical judging) instead of routing each sub-task to the most capable model.
- **Context Amnesia**: Interactions are ephemeral. Assistants forget developer preferences, design tokens, coding conventions, and physical environment contexts between sessions.
- **Passive Text-Only Nature**: Most chat bots cannot trigger real-world actions, control desktop applications, inspect live web pages, or respond to ambient physical presence.
- **Generic AI Persona**: Mainstream LLMs output generic, apologetic, verbose, and buzzword-heavy responses ("Certainly!", "Let's dive into this robust solution") that waste developer time.

Super AI solves these problems through an authoritative, transparent, visually immersive command cockpit.

---

## 3. User Personas & Target Audience

| Persona | Description | Primary Needs |
|---|---|---|
| **Mohit (Primary Operator)** | Solo developer and creator of Super AI | Direct, confident communication, zero fluff, instant Hinglish/English code-switching, full control over local system tools and IoT. |
| **Power User / Developer** | Engineers working with complex multi-file codebases | Autonomous multi-agent code generation, terminal execution, sandboxed browser inspection, strict TypeScript conventions. |
| **AI Researcher** | Practitioners evaluating multi-model systems | Complete cognitive trace transparency, model routing comparison, judge evaluation metrics, and fallback observability. |
| **IoT / Hardware Hacker** | Builders integrating physical sensors and smart home systems | Real-time presence detection, low-latency WebSocket telemetry, hardware webhook triggers. |

---

## 4. Product Requirements & Feature Hierarchy

### 4.1 P0 — Core Foundation (Must Have)

#### 4.1.1 3D Holographic Singularity Core & Hologram Scene
- **WebGL Procedural Hologram**: Implemented with Three.js featuring an emissive inner sphere, dual nested wireframe icosahedrons, 5 differential orbital gyroscope rings, and 3,200 reactive vector particles.
- **Facial Hologram Switcher**: Capable of toggling between the abstract neural singularity (`AICore3D`) and a futuristic 3D wireframe holographic face (`HologramScene`).
- **9-State Dynamic Reactive Engine**:
  - `IDLE`: Amber Solar (`hsl(40, 90%, 55%)`) — peaceful idle rotation and breathing glow.
  - `LISTENING`: Acoustic Cyan (`hsl(185, 100%, 50%)`) — audio-reactive particle waves.
  - `THINKING`: Neural Blue (`hsl(220, 100%, 60%)`) — inner core oscillation and fast gyroscopic ring spin.
  - `PROCESSING`: Scan Cyan (`hsl(195, 100%, 55%)`) — planar laser scanning effect.
  - `EXECUTING`: Surge Green (`hsl(150, 100%, 50%)`) — outward particle surge and high flux.
  - `SPEAKING`: Harmonic Violet (`hsl(270, 80%, 65%)`) — audio waveform pulsing in sync with voice output.
  - `AUTHORIZATION`: Security Amber (`hsl(45, 100%, 50%)`) — pulsating shield geometry and locked rings.
  - `ERROR`: Flux Red (`hsl(0, 100%, 55%)`) — chromatic jitter, particle scattering, and glitch state.
  - `RECOVERING`: Healing Teal (`hsl(170, 80%, 50%)`) — clockwise restorative harmonic spin.
- **Parallax Responsiveness**: Real-time cursor tracking and inertia tilting.

#### 4.1.2 Cognitive Brain & Role-Based Model Routing
- **Specialized Roles**:
  - `general`: Daily inquiries, conversations, and task orchestration.
  - `reasoning`: Complex mathematical deductions, planning, and multi-step logic.
  - `coding`: Technical architecture, refactoring, and code generation.
  - `vision`: Image analysis, diagram interpretation, and spatial inspection.
  - `judge`: Post-execution quality evaluation and critique.
- **Multi-Provider Key Management**: Client-side AES-256-GCM encrypted storage for OpenRouter, Google Gemini, and OpenAI-compatible API keys.
- **Tactical Activity Feed**: Real-time message streaming with expandable cognitive traces, tool execution badges, and syntax-highlighted code blocks.

---

### 4.2 P1 — Autonomous Intelligence, Swarm & Design Genius

#### 4.2.1 Swarm Multi-Agent Intelligence
- **Head Orchestrator (`HEAD`)**: Decomposes complex user goals into structured sub-tasks.
- **Parallel Specialist Execution**: Concurrently spawns `CODER`, `SCRAPER`, and `TESTER` agents to solve sub-problems in parallel.
- **Head Synthesis**: Aggregates disparate agent results into an authoritative, unified briefing.

#### 4.2.2 Design Genius Pipeline & Humanizer
- **Design Intent Router**: Automatically detects UI, component, CSS, and frontend requests via keyword classification.
- **3-Stage Pipeline**:
  - **Stage 1 (`DESIGNER`)**: Injects `tokens.css` and `brand.md` into context to generate strict, token-compliant React components.
  - **Stage 2 (`COPY_EDITOR`)**: Reviews generated components to eliminate corporate filler and enforce `voice.md`.
  - **Stage 3 (`humanizer`)**: Middleware stripping banned phrases ("seamless", "robust", "dive in", "delve") from all user-facing copy.

#### 4.2.3 Hierarchical Memory Subsystem
- **Working Memory**: Dynamic in-session scratchpad tracking active goals and intermediate tool outputs.
- **Short-Term Memory**: Conversation history buffer with configurable window limits and token management.
- **Long-Term Memory**: Fact-based key-value store with categorization (`user_preference`, `project_fact`, `instruction`, `general`), importance scoring, and retention policies.
- **Design Memory**: In-memory cached bridge serving `tokens.css`, `brand.md`, and `voice.md` dynamically into agent prompts.

#### 4.2.4 Tool Registry & Authorization Safety Gate
- **Tool Categories**: System, Web, Automation, Filesystem, IoT.
- **Three-Tier Permission Model**: `ALLOW` (immediate execution), `ASK` (user confirmation prompt), `DENY` (blocked).
- **Risk Classification**: `NONE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **Interactive Tool Authorization Modal**: Modal popping up with parameter diffs and risk warnings whenever a sensitive tool is invoked.

#### 4.2.5 Voice Command & Real-Time Audio Streaming
- **Dual Voice Pipeline**:
  - Web Speech API for low-latency browser-native speech recognition and synthesis.
  - Dedicated WebSocket streaming service (`/api/ws/voice`) for cinematic cloud TTS (ElevenLabs, Edge TTS).

---

### 4.3 P2 — Hardware IoT, Desktop Control & Automation

#### 4.3.1 IoT mmWave Radar Telemetry & Smart Gate
- **Radar WebSocket (`/api/ws/radar`)**: Real-time bi-directional telemetry streaming presence detection, movement vectors, target distance, breathing rates, and signal strength.
- **Automated AI State Adaptation**: AI transitions from `IDLE` to alert when user presence is detected by the radar.
- **Smart Gate Automation**: Webhook and tool integration to trigger physical relay gates based on security clearance.

#### 4.3.2 Windows Computer Control & Browser Automation
- **Computer Control V1**: Allowlisted application launching, local folder opening, keyboard shortcuts, and full-screen screenshots.
- **Sandboxed Browser Control**: Puppeteer-based headless browser navigation, DOM text extraction, link discovery, and page interaction with strict security constraints (blocking credentials, arbitrary JS execution, and payment checkouts).
- **Python Sandbox**: Isolated code runner executing scripts within `sandbox_workspace/`.
- **Telegram Bot Remote Gateway**: Secure bridge allowing remote status inquiries and alerts via Telegram.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Performance & Latency
- **WebGL Frame Rate**: 3D Hologram core must maintain 60 FPS on standard modern integrated GPUs (Intel Iris Xe / AMD Radeon) and dedicated GPUs.
- **State Transition Latency**: AI state visual transitions (color shift, particle velocity changes) must take effect within <100ms of an event.
- **WebSocket Streaming**: Radar sensor telemetry updates pushed at <= 200ms intervals without dropping frames.
- **First Response Streaming**: SSE chat response first-token latency < 1.5s on fast cloud models (Gemini Flash, Groq).

### 5.2 Security & Privacy
- **Encryption at Rest**: All stored credentials, API keys, and configuration files encrypted using AES-256-GCM with distinct IVs.
- **Zero Plaintext Leakage**: Masked key representation (`sk-...abcd`) displayed across client UI; unmasked keys never logged in server console.
- **Process Sandboxing**: File operations strictly scoped within the project root and allowed workspace directories; directory traversal attacks (`../../`) strictly rejected.
- **Network Boundaries**: Browser automation prohibits accessing password managers, saving auth cookies to disk, or executing arbitrary third-party extensions.

### 5.3 Reliability & Self-Healing
- **Recovery Observability Engine**: Automatically detects failed tool executions, rate limits (HTTP 429), or malformed outputs.
- **Circuit Breakers & Fallback**: Automatic retry with exponential backoff; seamless failover to secondary model providers if primary model fails.

---

## 6. Success Metrics & Key Performance Indicators (KPIs)

| Metric | Target | Verification Method |
|---|---|---|
| **Autonomous Task Completion** | > 92% successful step execution | Automated task run telemetry in `TaskHistoryItem` |
| **Design Compliance** | 100% token usage from `tokens.css` | Design pipeline linting and stage validation |
| **Voice Persona Fidelity** | 0 occurrences of banned words | Automated regex scanner in `humanizer.ts` |
| **System Uptime & Stability** | Zero unhandled process crashes | Global Express error boundaries and WebSocket reconnects |
| **Local Storage Security** | 100% encrypted key storage | Security audit log inspections |

---

## 7. Product Milestones & Release Timeline

```mermaid
gantt
    title Super AI Development Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Core Foundation
    3D Hologram & Three.js Core        :done, p1_1, 2026-07-01, 2026-07-15
    Multi-Model Routing & Encrypted DB :done, p1_2, 2026-07-16, 2026-07-31
    section Phase 2: Memory & Tools
    Hierarchical Memory Architecture   :done, p2_1, 2026-08-01, 2026-08-15
    Built-in Tools & Authorization Gate :done, p2_2, 2026-08-16, 2026-08-31
    section Phase 3: Swarm & Design Genius
    Multi-Agent Swarm Router           :done, p3_1, 2026-09-01, 2026-09-12
    Design Genius & Humanizer Pipeline :done, p3_2, 2026-09-13, 2026-09-20
    section Phase 4: IoT & Voice Streaming
    Radar WebSocket & Smart Gate       :active, p4_1, 2026-09-21, 2026-10-05
    Cinematic Cloud Voice Stream       :active, p4_2, 2026-10-01, 2026-10-15
    section Phase 5: Vision & Scaling
    Real-Time Screen Vision Stream     :planned, p5_1, 2026-10-16, 2026-11-15
```

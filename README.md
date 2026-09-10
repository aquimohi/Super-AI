# Super AI

> Futuristic personal AI assistant featuring a real-time animated 3D holographic neural core, multi-model cognitive orchestration, autonomous task execution, and a tactical command center interface.

---

## Overview

**Super AI** is an advanced AI assistant platform inspired by high-tech holographic command consoles (JARVIS-style). Built with a full-stack architecture (Express + React 19 + Three.js + Tailwind CSS), it combines real-time spatial visual feedback with cognitive routing, autonomous multi-step planning, working and long-term memory, voice interaction, and security authorization gates.

---

## Key Features

### 1. Real-Time 3D Holographic Singularity Core
- **Procedural Hologram**: Implemented with Three.js featuring an emissive inner core, nested icosahedron lattices, 5 differential orbital gyroscope rings, and 3,200 reactive vector particles.
- **Dynamic State Engine**: Adapts color palettes, rotation rates, pulse frequencies, laser scanning planes, and shield geometries across system states:
  - `IDLE` (Amber solar resonance)
  - `LISTENING` (Acoustic cyan pulse)
  - `THINKING` (Deep neural blue oscillation)
  - `PROCESSING` (High-frequency cyan scan)
  - `EXECUTING` (Dynamic particle surge)
  - `SPEAKING` (Harmonic acoustic emission)
  - `AUTHORIZATION` (Amber security clearance barrier)
  - `ERROR` (Quantum flux chromatic jitter)
  - `RECOVERING` (Restorative self-healing loop)
- **Interactive Parallax**: Subtly responds to pointer movements and canvas resizing.

### 2. Cognitive Brain & Multi-Model Orchestration
- **Specialized Roles**: Dynamic role configuration across `general`, `reasoning`, `coding`, `vision`, and `judge`.
- **OpenRouter & Provider Integration**: Support for OpenRouter, Google Gemini, and OpenAI-compatible providers with client-side encrypted key management (`AES-256-GCM`).
- **Autonomous Task Engine**: Deconstructs complex user prompts into discrete executable steps, verifies prerequisites, and tracks step execution history.
- **Self-Healing & Recovery Engine**: Observability layer capable of detecting execution failures, initiating retry circuits, fallback strategies, and self-stabilization.

### 3. Comprehensive Tool & Capability Ecosystem
- **Built-in System Tools**:
  - `current_date` & `current_time`
  - `calculator` (Mathematical expression evaluator)
  - `read_file` (Secure local file reading)
  - `web_search` (Real-time web discovery & search queries)
- **Browser Automation (Planned Actions)**: Structured URL validation, DOM inspection, navigation, and screenshot action abstractions.
- **Computer Control (Planned Actions)**: Allowlisted application launching, keyboard shortcuts, and file browsing with role-based permission boundaries.

### 4. Memory & Context Architecture
- **Hierarchical Memory**:
  - **Working Memory**: Active session scratchpad for current multi-turn goal tracking.
  - **Short-Term Memory**: Conversation history with configurable context window length.
  - **Long-Term Memory**: Structured factual memories with importance scoring, tags, and retention policies (30 days, 90 days, or permanent).

### 5. Tactical Command Center HUD
- **HUD Navigation**: Live AI state indicator, active model pill, voice feedback toggle, and direct Control Panel launcher.
- **Side Telemetry Panel**: Live system metrics, flux readings, holographic coherence meters, audio spectral waveforms, and cognitive reasoning traces.
- **Activity & Dialogue Feed**: Formatted conversation logs with expandable tool execution badges, cognitive trace inspections, and markdown rendering.
- **Control Panel**: Tabbed configuration suite for API Keys, Models, Routing, Permissions, Tools, Skills, Browser Control, Computer Control, Voice, Memory, Autonomous Tasks, and Security Logs.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Three.js, Tailwind CSS v4, Motion, Lucide React
- **Backend**: Express 4, Node.js (via `tsx` in development, bundled with `esbuild` for production)
- **AI Integrations**: Google Gen AI SDK (`@google/genai`), OpenRouter API
- **Persistence & Security**: Encrypted JSON storage (`AES-256-GCM`), sandboxed execution

---

## Getting Started

### Prerequisites

- **Node.js**: v20+ recommended
- **npm** or **bun**

### Installation

1. Clone or download the repository:
   ```bash
   git clone <repository-url>
   cd super-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Variables (Optional):
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   - `GEMINI_API_KEY`: Server-side Gemini API key (automatically injected in Google AI Studio).
   - `APP_SECRET_KEY`: Optional 32-character key for data encryption at rest.

### Development

Start the development server with live server and client compilation:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### Production Build

Build the client assets and bundle the standalone CommonJS server:
```bash
npm run build
```

Run the production server:
```bash
npm start
```

### Linting & Code Verification

Check TypeScript types and codebase health:
```bash
npm run lint
```

---

## Project Structure

```
├── public/                    # Static assets
├── server/                    # Express backend services
│   ├── routes/                # API endpoints (chat, config, keys, memory, tasks)
│   ├── services/
│   │   ├── browser/           # Browser automation & URL validation
│   │   ├── cognitive/         # Planner, specialist, judge, and cognitive brain
│   │   ├── memory/            # Storage, working memory, and long-term memory
│   │   ├── task/              # Autonomous task engine & recovery observer
│   │   └── tools/             # Built-in tool registry & implementations
│   ├── crypto.ts              # AES-256-GCM encryption utilities
│   └── storage.ts             # App store configuration & audit logs
├── src/                       # React frontend application
│   ├── components/            # UI components
│   │   ├── control-panel/     # Control Panel configuration tabs
│   │   ├── ActivityFeed.tsx   # Dialogue feed & event stream
│   │   ├── AICore3D.tsx       # Three.js holographic singularity core
│   │   ├── ChatInputArea.tsx  # Input controls, voice input, and hotkeys
│   │   ├── SideTelemetryPanel.tsx # HUD metrics & telemetry
│   │   ├── StateController.tsx# Manual state override bar
│   │   └── TopNavigation.tsx  # Top HUD status bar
│   ├── services/              # Client API bridge
│   ├── utils/                 # Web Speech API & speech synthesis
│   ├── App.tsx                # Main application layout & orchestration
│   ├── index.css              # Global styles & tactical grid overlays
│   ├── main.tsx               # Client entry point
│   └── types.ts               # Shared TypeScript schemas and interfaces
├── metadata.json              # AI Studio applet metadata & permissions
├── server.ts                  # Server entry point & Vite middleware setup
└── package.json               # Project manifest & build scripts
```

---

## License

Apache-2.0

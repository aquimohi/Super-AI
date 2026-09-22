# Rules & Development Guidelines
## Super AI — Coding Standards, Conventions & Personality Bible

**Document Version**: 2.0  
**Status**: Mandatory Standard  
**Applies To**: All human contributors and AI coding agents  

---

## 1. Core Engineering Principles

1. **Clarity Over Cleverness**: Code must be immediately readable and self-documenting.
2. **Fail Loudly & Gracefully**: Never swallow exceptions silently. Log failures with context, transition the AI state machine cleanly (e.g. to `ERROR` or `RECOVERING`), and return actionable diagnostic messages.
3. **Zero Plaintext Secrets**: API keys, auth tokens, and sensitive system credentials must NEVER be stored, logged, or serialized in plaintext. Always use AES-256-GCM encryption.
4. **No Dead Code**: Remove commented-out blocks, unused imports, and abandoned experiments before committing.
5. **Architectural Integrity**: Maintain the strict separation between Three.js imperative WebGL rendering loops, React 19 declarative HUD state, and the Express 4 backend orchestrator.

---

## 2. TypeScript & Code Standards

### 2.1 Compiler & Type Safety
- **Strict Mode Enabled**: `tsconfig.json` runs in strict mode. Never disable `strict: true` or bypass compiler safety checks.
- **Strict Ban on `any`**:
  ```ts
  // ❌ FORBIDDEN
  function handleData(input: any): any { ... }

  // ✅ REQUIRED: Use unknown with type guards or strict interfaces
  function handleData(input: unknown): NormalizedPayload {
    if (!isValidPayload(input)) {
      throw new Error('Invalid payload schema');
    }
    return input;
  }
  ```
- **Type vs Interface**: Use `interface` for expandable object schemas (props, API contracts, entity records). Use `type` for unions, intersections, and state literals:
  ```ts
  export type AIState = 'IDLE' | 'LISTENING' | 'THINKING' | 'PROCESSING' | 'EXECUTING' | 'SPEAKING' | 'ERROR' | 'AUTHORIZATION' | 'RECOVERING';
  
  export interface ToolItem {
    id: string;
    name: string;
    risk: ToolRiskLevel;
  }
  ```
- **Explicit Return Types**: All functions and async handlers must specify explicit return types.
- **Centralized Types**: Shared types belong in `src/types.ts` for frontend and shared contracts, or co-located `types.ts` within server service directories.

---

## 3. Frontend & React 19 Guidelines

### 3.1 Component Architecture
- **Functional Components Only**: Class components are prohibited.
- **Single Component Per File**: File names must match the component in PascalCase (e.g., `SideTelemetryPanel.tsx`).
- **Props Declaration**: Define a typed props interface at the top of the component file:
  ```tsx
  interface SideTelemetryPanelProps {
    metrics: SystemMetrics;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
  }

  export function SideTelemetryPanel({ metrics, isCollapsed, onToggleCollapse }: SideTelemetryPanelProps) {
    // ...
  }
  ```

### 3.2 Three.js & WebGL Isolation
- **Imperative Animation Loop**: Keep Three.js `requestAnimationFrame` render loops outside React state triggers to avoid re-rendering React trees at 60 FPS.
- **Canvas Lifecycle & Clean Disposal**: Always clean up WebGL geometries, materials, textures, and event listeners in the `useEffect` cleanup return:
  ```tsx
  useEffect(() => {
    // Scene setup ...
    return () => {
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);
  ```

### 3.3 Tailwind CSS v4 & Styling Rules
- **Use Frozen Tokens**: Always style using design tokens from `tokens.css` (e.g., `var(--bg-void)`, `var(--border-default)`).
- **Glassmorphism Discipline**: Card surfaces must use `bg-black/60 backdrop-blur-md border border-white/20`.
- **No Inconsistent Inline Colors**: Use the predefined state color variables rather than hardcoded random hex values.

---

## 4. Backend & Service Layer Guidelines

### 4.1 Route Modularity & Async Handlers
- Routes must reside in `server/routes/` and be mounted in `server.ts`.
- Every async route handler must be wrapped in `try/catch` or an async error boundary to prevent unhandled promise rejections:
  ```ts
  apiKeysRouter.post('/save', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key, provider } = req.body;
      const encrypted = await encryptApiKey(key);
      res.json({ success: true, masked: maskKey(key) });
    } catch (err) {
      next(err);
    }
  });
  ```

### 4.2 Dual WebSocket Upgrade Isolation
When adding or modifying WebSocket endpoints on the shared HTTP server, never unilaterally call `socket.destroy()` without verifying all path matchers:
```ts
// In server.ts HTTP upgrade listener
httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
  if (url.pathname === '/api/ws/radar') {
    radarWss.handleUpgrade(request, socket, head, (ws) => {
      radarWss.emit('connection', ws, request);
    });
  } else if (url.pathname !== '/api/ws/voice') {
    // Only destroy if NEITHER radar nor voice matched
    socket.destroy();
  }
});
```

---

## 5. Design Genius & Voice Rules (Mandatory Persona Bible)

Super AI is NOT a generic corporate bot. It is Mohit's personal intelligence — sharp, direct, authoritative, and built in Delhi. It speaks like a brilliant peer who knows everything, not a customer service chatbot.

### 5.1 Permanently Banned Words

The following words and phrases are **strictly banned** from Super AI's vocabulary:

| ❌ Banned Phrase | ✅ What to Use Instead |
|---|---|
| *seamless* | smooth, clean, fast |
| *robust* | solid, reliable, built right |
| *dive in / let's dive in* | let's start, here's the deal |
| *leverage / utilize* | use, apply |
| *innovative / cutting-edge* | new, fresh, sharp |
| *comprehensive* | full, complete, thorough |
| *state-of-the-art* | best available, top-tier |
| *paradigm / synergy* | system, teamwork, approach |
| *delve* | examine, look at, go into |
| *certainly / absolutely* | yes, sure, of course |
| *I'd be happy to...* | *(just do it — don't announce it)* |
| *Of course! / Great question!* | *(never say this — it's hollow flattery)* |
| *Let me know if you need anything else!* | *(avoid closing fluff — respect time)* |

### 5.2 Banned Structural Patterns
- **No Bullet-Point Spam**: Conversational answers must be in clean, natural prose (1–3 sentences). Bullet points are reserved for technical checklists and comparison tables.
- **No Em-Dash Abuse**: Maximum 1 em-dash (`—`) per response.
- **No Echoing**: Never repeat the user's prompt back to them before answering.
- **Conversational Code-Switching**: When spoken to in Hinglish, respond naturally in Hinglish without being forced:
  - *Example*: "Sab smooth chal raha hai bhai. CPU chill hai, memory solid hai. Koi tension nahi."

### 5.3 Humanizer Middleware
All non-code output generated by agents (`HEAD`, `COPY_EDITOR`, `SCRAPER`) must pass through `server/design_genius/humanizer.ts` before reaching the user.

---

## 6. Security, Permissions & Sandboxing

### 6.1 Cryptographic Storage
- Encryption at rest is mandatory for all keys stored in `.data/` or `storage.ts`.
- Use `encryptData(plaintext)` and `decryptData(ciphertext)` from `server/crypto.ts`.
- Plaintext API keys must never be returned in GET requests — return masked keys (`sk-...1234`).

### 6.2 Filesystem & Command Sandboxing
- Any tool executing file reads or writes (`read_file`, `createFileTool`, `repoModifier`) MUST validate paths to ensure they stay within the project root:
  ```ts
  const safePath = path.resolve(WORKSPACE_ROOT, relativePath);
  if (!safePath.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Access denied: Path traversal outside workspace');
  }
  ```
- All arbitrary code executions must run in `sandbox_workspace/` with restricted timeouts (default 15s).

### 6.3 Browser Control Guardrails
- Block password input extraction.
- Block access to local system URLs (`file://`, `chrome://`, `localhost` admin panels without explicit override).
- Reject automated checkout/payment forms.
- Forbid downloading executable binaries (`.exe`, `.msi`, `.bat`, `.cmd`, `.sh`, `.ps1`).

---

## 7. Verification & Commit Quality Checklist

Before committing or pushing code:
1. **Type Checking**:
   ```bash
   npm run lint
   ```
   Must pass with 0 errors and 0 warnings.
2. **Build Validation**:
   ```bash
   npm run build
   ```
   Must bundle client assets and compile `dist/server.cjs` cleanly.
3. **No Unencrypted Secrets**: Confirm no `.env` or API keys are committed to Git.
4. **Clean Logs**: Remove debugging `console.log` statements containing raw payload dumps.

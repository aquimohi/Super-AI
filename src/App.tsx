/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AIState, ChatMessage, ControlPanelSection, PendingToolAuthorization, CanvasFile, CanvasLanguage, AttachedFile } from './types';
import { AICore3D } from './components/AICore3D';
// ── Hologram Face (new) — swap back to AICore3D by reverting lines 662-664 ──
import { HologramScene } from './components/hologram/HologramScene';
import { TopNavigation } from './components/TopNavigation';
import { StateController } from './components/StateController';
import { SideTelemetryPanel } from './components/SideTelemetryPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { ChatInputArea } from './components/ChatInputArea';
import { ControlPanelModal } from './components/control-panel/ControlPanelModal';
import { PermissionPromptModal } from './components/PermissionPromptModal';
import { ToolAuthorizationModal } from './components/ToolAuthorizationModal';
import { LiveCanvasStudio } from './components/canvas/LiveCanvasStudio';
import { apiClient, ChatApiResponse } from './services/apiClient';
import { useVoiceInput } from './hooks/useVoiceInput';
import {
  speakText,
  stopSpeech,
  subscribeSpeechState,
} from './utils/speech';
import { useRadarSocket } from './hooks/useRadarSocket';
import { useVoiceStream } from './hooks/useVoiceStream';
import { useJarvisVoice } from './hooks/useJarvisVoice';

const INITIAL_CANVAS_FILES: CanvasFile[] = [
  {
    id: 'file-html-index',
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Super AI Quantum Hub</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="glow-sphere"></div>
  <div class="card">
    <div class="badge">⚡ LIVE CANVASES ACTIVE</div>
    <h1>SUPER AI STUDIO</h1>
    <p class="subtitle">Real-time live code editing & instant sandbox preview.</p>
    
    <div class="stats-grid">
      <div class="stat-box">
        <span class="label">NEURAL MATRIX</span>
        <span class="value" id="matrix-val">3,200 VECTORS</span>
      </div>
      <div class="stat-box">
        <span class="label">SYNAPSE LATENCY</span>
        <span class="value" id="latency-val">1.4 ms</span>
      </div>
    </div>

    <button id="pulse-btn" class="cta-btn">ACTIVATE QUANTUM PULSE</button>
  </div>

  <script src="script.js"></script>
</body>
</html>`,
    updatedAt: Date.now(),
  },
  {
    id: 'file-css-styles',
    name: 'styles.css',
    language: 'css',
    content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 30%, #0d1627 0%, #05070c 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #f1f5f9;
  overflow: hidden;
  position: relative;
}

.glow-sphere {
  position: absolute;
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, rgba(34,211,238,0.25) 0%, rgba(168,85,247,0.15) 50%, transparent 70%);
  border-radius: 50%;
  filter: blur(40px);
  animation: float 6s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes float {
  0% { transform: scale(0.9) translate(-20px, -20px); }
  100% { transform: scale(1.1) translate(20px, 20px); }
}

.card {
  position: relative;
  z-index: 10;
  width: 90%;
  max-width: 480px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(56, 189, 248, 0.35);
  backdrop-filter: blur(20px);
  padding: 2.2rem;
  border-radius: 20px;
  box-shadow: 0 0 50px rgba(14, 165, 233, 0.15);
  text-align: center;
}

.badge {
  display: inline-block;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  margin-bottom: 1rem;
}

h1 {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffffff 30%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 1.8rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.8rem;
}

.stat-box {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.8rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-box .label {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: #64748b;
  font-weight: 600;
}

.stat-box .value {
  font-size: 0.9rem;
  font-weight: 700;
  color: #38bdf8;
  font-family: monospace;
}

.cta-btn {
  width: 100%;
  padding: 0.85rem;
  border-radius: 12px;
  border: 1px solid #38bdf8;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #000;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 0 20px rgba(14, 165, 233, 0.4);
}

.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(14, 165, 233, 0.7);
  background: #38bdf8;
}

.cta-btn:active {
  transform: translateY(0);
}`,
    updatedAt: Date.now(),
  },
  {
    id: 'file-js-script',
    name: 'script.js',
    language: 'javascript',
    content: `// Super AI Live Interactive Logic
let pulseCount = 0;
const pulseBtn = document.getElementById('pulse-btn');
const latencyVal = document.getElementById('latency-val');
const matrixVal = document.getElementById('matrix-val');

if (pulseBtn) {
  pulseBtn.addEventListener('click', () => {
    pulseCount++;
    const randomLatency = (Math.random() * 0.8 + 0.8).toFixed(1);
    if (latencyVal) latencyVal.innerText = randomLatency + ' ms';
    if (matrixVal) matrixVal.innerText = (3200 + pulseCount * 25) + ' VECTORS';

    // Flash background glow effect
    document.body.style.background = 'radial-gradient(circle at 50% 30%, #0369a1 0%, #05070c 100%)';
    setTimeout(() => {
      document.body.style.background = 'radial-gradient(circle at 50% 30%, #0d1627 0%, #05070c 100%)';
    }, 250);

    console.log('⚡ Quantum pulse #' + pulseCount + ' fired! Latency: ' + randomLatency + 'ms');
  });
}

console.log('🚀 Super AI Live Canvas Preview initialized successfully.');`,
    updatedAt: Date.now(),
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'sys-init',
    sender: 'SYSTEM',
    text: 'Quantum holographic core online. 3,200 particle vectors synchronized. Acoustic neural receptor active.',
    timestamp: '00:00:01',
  },
  {
    id: 'ai-welcome',
    sender: 'SUPER_AI',
    text: 'Greetings. I am Super AI. My 3D holographic neural matrix is operational. Open the Control Panel anytime to configure your OpenRouter API keys.',
    timestamp: '00:00:02',
  },
];

export default function App() {
  const [currentState, setCurrentState] = useState<AIState>('IDLE');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isProcessingSequence, setIsProcessingSequence] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(true); // Hidden per user request
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Control Panel state
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [controlPanelSection, setControlPanelSection] = useState<ControlPanelSection>('api-keys');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  // Permission Prompt Modal state
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [sessionMicGranted, setSessionMicGranted] = useState(false);

  // Live Canvas Studio state
  const [canvasFiles, setCanvasFiles] = useState<CanvasFile[]>(INITIAL_CANVAS_FILES);
  const [activeCanvasFileId, setActiveCanvasFileId] = useState<string>('file-html-index');
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasViewMode, setCanvasViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [isCanvasAiGenerating, setIsCanvasAiGenerating] = useState(false);

  const handleSelectCanvasFile = (id: string) => {
    setActiveCanvasFileId(id);
  };

  const handleUpdateCanvasFileContent = (id: string, content: string) => {
    setCanvasFiles((prev) =>
      prev.map((file) => {
        if (file.id === id) {
          return {
            ...file,
            content,
            isModified: content !== (file.originalContent ?? file.content),
            updatedAt: Date.now(),
          };
        }
        return file;
      })
    );
  };

  const handleCreateCanvasFile = (name: string, language: CanvasLanguage, content: string = '') => {
    const newId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newFile: CanvasFile = {
      id: newId,
      name,
      language,
      content,
      originalContent: content,
      updatedAt: Date.now(),
      isModified: false,
    };
    setCanvasFiles((prev) => [...prev, newFile]);
    setActiveCanvasFileId(newId);
  };

  const handleDeleteCanvasFile = (id: string) => {
    setCanvasFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (filtered.length > 0 && activeCanvasFileId === id) {
        setActiveCanvasFileId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleRenameCanvasFile = (id: string, newName: string) => {
    setCanvasFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  const handleUploadCanvasFiles = async (files: FileList | File[]) => {
    const newCanvasFiles: CanvasFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase() || 'text';
        const langMap: Record<string, CanvasLanguage> = {
          html: 'html',
          htm: 'html',
          css: 'css',
          js: 'javascript',
          jsx: 'javascript',
          ts: 'typescript',
          tsx: 'typescript',
          py: 'python',
          json: 'json',
          md: 'markdown',
          txt: 'text',
        };
        const lang = langMap[ext] || 'text';
        const newFile: CanvasFile = {
          id: `upload-${Date.now()}-${i}`,
          name: file.name,
          language: lang,
          content: text,
          originalContent: text,
          updatedAt: Date.now(),
          isModified: false,
        };
        newCanvasFiles.push(newFile);
      } catch (err) {
        console.warn('Failed to read uploaded file:', file.name, err);
      }
    }

    if (newCanvasFiles.length > 0) {
      setCanvasFiles((prev) => [...prev, ...newCanvasFiles]);
      setActiveCanvasFileId(newCanvasFiles[0].id);
      setIsCanvasOpen(true);
    }
  };

  const handleOpenInCanvas = (file: { name: string; content: string; language?: string }) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'text';
    const langMap: Record<string, CanvasLanguage> = {
      html: 'html',
      htm: 'html',
      css: 'css',
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      json: 'json',
      md: 'markdown',
      txt: 'text',
    };
    const lang = (file.language as CanvasLanguage) || langMap[ext] || 'text';

    // Check if a file with this name already exists
    const existing = canvasFiles.find((f) => f.name.toLowerCase() === file.name.toLowerCase());
    if (existing) {
      handleUpdateCanvasFileContent(existing.id, file.content);
      setActiveCanvasFileId(existing.id);
    } else {
      const newId = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newFile: CanvasFile = {
        id: newId,
        name: file.name,
        language: lang,
        content: file.content,
        originalContent: file.content,
        updatedAt: Date.now(),
        isModified: false,
      };
      setCanvasFiles((prev) => [...prev, newFile]);
      setActiveCanvasFileId(newId);
    }

    setIsCanvasOpen(true);
  };

  const handleCanvasAiPrompt = async (prompt: string, activeFile: CanvasFile) => {
    setIsCanvasAiGenerating(true);
    try {
      const aiPromptMessage = `Active File: "${activeFile.name}" (${activeFile.language})
User Request: ${prompt}

Current Code:
\`\`\`${activeFile.language}
${activeFile.content}
\`\`\`

Please update this code according to the user request. Output the complete updated code inside a \`\`\`${activeFile.language} ... \`\`\` code block so it can be applied directly to the Live Canvas.`;

      const response = await apiClient.sendChatMessage({
        message: aiPromptMessage,
        conversationId,
      });

      if (response.text) {
        // Extract code block
        const match = response.text.match(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]+?)```/);
        if (match) {
          const updatedCode = match[1].trim();
          handleUpdateCanvasFileContent(activeFile.id, updatedCode);
        } else {
          console.log('AI response without code block:', response.text);
        }
      }
    } catch (err) {
      console.error('Canvas AI error:', err);
    } finally {
      setIsCanvasAiGenerating(false);
    }
  };

  // Tool Authorization Modal state
  const [isToolAuthModalOpen, setIsToolAuthModalOpen] = useState(false);
  const [pendingToolAuth, setPendingToolAuth] = useState<PendingToolAuthorization | null>(null);
  const [sessionToolAuthorizations, setSessionToolAuthorizations] = useState<string[]>([]);
  const activeChatRequestRef = useRef<{ message: string; history: ChatMessage[] } | null>(null);

  // System Configuration Cache (for synchronous checks without losing user gesture)
  const systemConfigRef = useRef<any>(null);

  // IoT Hardware Integration
  const { radarData, socketState: radarSocketState } = useRadarSocket();

  // ── Real-time lip-sync flag: true while browser speechSynthesis is speaking ──
  const [isSpeakingFlag, setIsSpeakingFlag] = useState(false);

  // Voice recognition & synthesis state
  const {
    isListening,
    transcript: voiceTranscript,
    startWakeWordMode,
    stopWakeWordMode,
    startPushToTalk,
    stopPushToTalk,
    isWakeWordMode,
    error: voiceError,
    setLanguage
  } = useVoiceInput({
    onWakeWordDetected: (text) => {
      handleSendMessage(text);
    },
    onFinalTranscript: (text) => {
      handleSendMessage(text);
    },
    pauseRecognition: isSpeakingFlag,
  });

  // Phase 5: Real-time Voice & Jarvis Audio Engine
  const {
    stopAudio: stopJarvisVoice,
  } = useJarvisVoice();

  // Stop vocal output immediately and return 3D core to IDLE
  const handleStopSpeaking = useCallback(() => {
    stopSpeech();
    stopJarvisVoice();
    setCurrentState('IDLE');
    setIsProcessingSequence(false);
  }, [stopJarvisVoice]);

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      if (!next) {
        handleStopSpeaking();
      }
      return next;
    });
  }, [handleStopSpeaking]);

  const {
    isStreaming: isLiveVoice,
    volume: micVolume,
    startStream: startLiveVoice,
    stopStream: stopLiveVoice
  } = useVoiceStream();

  const handleToggleLiveVoice = useCallback(() => {
    if (isLiveVoice) {
      stopLiveVoice();
    } else {
      startLiveVoice();
    }
  }, [isLiveVoice, startLiveVoice, stopLiveVoice]);

  // Subscribe to the speech synthesis event bus (fires on utterance start/end)
  useEffect(() => {
    const unsub = subscribeSpeechState((speaking) => {
      setIsSpeakingFlag(speaking);
    });
    return unsub;
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await apiClient.getConfig();
      systemConfigRef.current = cfg;
    } catch (err) {
      console.warn('Failed to load system config cache:', err);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const handleOpenControlPanel = (section: ControlPanelSection = 'api-keys') => {
    setControlPanelSection(section);
    setIsControlPanelOpen(true);
  };

  // Auto-collapse side panels on smaller screens to maximize 3D core focus
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setLeftPanelCollapsed(true);
      setRightPanelCollapsed(true);
    }
  }, []);

  // Keyboard shortcut listener for fast testing (1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key) {
        case '1':
          setCurrentState('IDLE');
          break;
        case '2':
          setCurrentState('LISTENING');
          break;
        case '3':
          setCurrentState('THINKING');
          break;
        case '4':
          setCurrentState('PROCESSING');
          break;
        case '5':
          setCurrentState('SPEAKING');
          break;
        case '6':
          setCurrentState('ERROR');
          break;
        case '7':
          setCurrentState('RECOVERING');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Glitch auto-recovery
  const handleGlitchEnd = useCallback(() => {
    setCurrentState('IDLE');
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'SYSTEM',
        text: 'Self-diagnostic completed. Hologram lattice re-stabilized. Core returned to IDLE equilibrium.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  // Process AI response and handle state/voice transitions
  const processChatResponse = async (response: ChatApiResponse) => {
    // Check if tool execution authorization is required
    if (response.requiresAuthorization && response.pendingAuthorization) {
      setCurrentState('AUTHORIZATION');
      setPendingToolAuth(response.pendingAuthorization as PendingToolAuthorization);
      setIsToolAuthModalOpen(true);
      setIsProcessingSequence(false);
      return;
    }

    const replyText =
      response.text ||
      'Cognitive transmission received and integrated into neural matrix.';

    if (response.conversationId) {
      setConversationId(response.conversationId);
    }

    // Handle Client Action (e.g. Open URL in client browser tab)
    if (response.clientAction?.type === 'OPEN_URL' && response.clientAction.url) {
      try {
        const targetWindow = window.open(
          response.clientAction.url,
          response.clientAction.target || '_blank',
          'noopener,noreferrer'
        );
        if (!targetWindow || targetWindow.closed || typeof targetWindow.closed === 'undefined') {
          console.warn('[Super AI] Popup was blocked by browser. Tactical 1-click launcher card rendered in feed.');
        }
      } catch (openErr) {
        console.warn('[Super AI] Client tab open error:', openErr);
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now() + 1),
        sender: 'SUPER_AI',
        text: replyText,
        timestamp: new Date().toLocaleTimeString(),
        modelUsed: response.metadata?.selectedModel || response.model,
        providerUsed: response.metadata?.provider || response.provider,
        taskType: response.metadata?.taskType || response.taskType,
        keyUsedName: response.metadata?.keyLabel || response.keyUsedName,
        latencyMs: response.metadata?.latencyMs || response.latencyMs,
        fallbackOccurred: response.metadata?.fallbackOccurred,
        toolActivities: (response.toolActivities as any) || undefined,
        memoryEvents: response.memoryEvents || undefined,
        conversationId: response.conversationId,
        cognitiveTrace: response.cognitiveTrace,
        judgeEvaluation: response.judgeEvaluation,
        clientAction: response.clientAction,
      },
    ]);

    // Check if voice output is enabled in system settings AND user hasn't muted
    const cfg = systemConfigRef.current || (await apiClient.getConfig().catch(() => null));
    const voiceOutputActive = (cfg?.voice?.voiceOutputEnabled ?? false) && audioEnabled;

    if (voiceOutputActive) {
      // While speaking: 3D CORE = SPEAKING
      setCurrentState('SPEAKING');

      const spoken = speakText(
        replyText,
        cfg?.voice,
        () => {
          setCurrentState('SPEAKING');
        },
        () => {
          // When speech ends: 3D CORE = IDLE
          setCurrentState('IDLE');
          setIsProcessingSequence(false);
        }
      );

      if (!spoken) {
        setCurrentState('IDLE');
        setIsProcessingSequence(false);
      }
    } else {
      // Voice Output = OFF: Return to IDLE
      setCurrentState('IDLE');
      setIsProcessingSequence(false);
    }
  };

  const handleChatError = (err: any) => {
    const errorMessage =
      err.message ||
      'No active OpenRouter API key found. Please open the Control Panel to add your key.';

    setCurrentState('ERROR');
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now() + 1),
        sender: 'SUPER_AI',
        text: `${errorMessage} Open the [CONTROL PANEL] in the top navigation bar to configure your OpenRouter API keys directly from the interface.`,
        timestamp: new Date().toLocaleTimeString(),
        providerUsed: 'system',
        isError: true,
      },
    ]);

    setTimeout(() => {
      setCurrentState('IDLE');
      setIsProcessingSequence(false);
    }, 3500);
  };

  // Tool Authorization Handlers
  const handleApproveTool = async () => {
    if (!pendingToolAuth || !activeChatRequestRef.current) return;
    const req = activeChatRequestRef.current;
    const toolAuth = pendingToolAuth;

    setIsToolAuthModalOpen(false);
    setIsProcessingSequence(true);
    setCurrentState('PROCESSING');

    try {
      const response = await apiClient.sendChatMessage({
        message: req.message,
        history: req.history,
        conversationId,
        sessionAuthorizations: sessionToolAuthorizations,
        isAutonomousTask: toolAuth.isAutonomousTask,
        taskId: toolAuth.taskId,
        authorizationDecision: 'AUTHORIZE_ONCE',
        stepId: toolAuth.stepId,
        approvedToolCall: {
          tool: toolAuth.tool,
          arguments: toolAuth.arguments,
          toolCallId: (toolAuth as any).toolCallId,
        },
      });
      await processChatResponse(response);
    } catch (err: any) {
      handleChatError(err);
    } finally {
      setPendingToolAuth(null);
    }
  };

  const handleAuthorizeToolForTask = async () => {
    if (!pendingToolAuth || !activeChatRequestRef.current) return;
    const req = activeChatRequestRef.current;
    const toolAuth = pendingToolAuth;

    setIsToolAuthModalOpen(false);
    setIsProcessingSequence(true);
    setCurrentState('PROCESSING');

    try {
      const response = await apiClient.sendChatMessage({
        message: req.message,
        history: req.history,
        conversationId,
        sessionAuthorizations: sessionToolAuthorizations,
        isAutonomousTask: true,
        taskId: toolAuth.taskId,
        taskScopedAuthorization: true,
        authorizationDecision: 'ALLOW_FOR_TASK',
        stepId: toolAuth.stepId,
        approvedToolCall: {
          tool: toolAuth.tool,
          arguments: toolAuth.arguments,
          toolCallId: (toolAuth as any).toolCallId,
        },
      });
      await processChatResponse(response);
    } catch (err: any) {
      handleChatError(err);
    } finally {
      setPendingToolAuth(null);
    }
  };

  const handleAuthorizeToolForSession = async () => {
    if (!pendingToolAuth || !activeChatRequestRef.current) return;
    const req = activeChatRequestRef.current;
    const toolAuth = pendingToolAuth;
    const updatedSessionAuths = Array.from(new Set([...sessionToolAuthorizations, toolAuth.tool]));
    setSessionToolAuthorizations(updatedSessionAuths);

    setIsToolAuthModalOpen(false);
    setIsProcessingSequence(true);
    setCurrentState('PROCESSING');

    try {
      const response = await apiClient.sendChatMessage({
        message: req.message,
        history: req.history,
        conversationId,
        sessionAuthorizations: updatedSessionAuths,
        isAutonomousTask: toolAuth.isAutonomousTask,
        taskId: toolAuth.taskId,
        taskScopedAuthorization: true,
        authorizationDecision: 'ALLOW_FOR_TASK',
        stepId: toolAuth.stepId,
        approvedToolCall: {
          tool: toolAuth.tool,
          arguments: toolAuth.arguments,
          toolCallId: (toolAuth as any).toolCallId,
        },
      });
      await processChatResponse(response);
    } catch (err: any) {
      handleChatError(err);
    } finally {
      setPendingToolAuth(null);
    }
  };

  const handleRejectTool = async () => {
    if (!pendingToolAuth || !activeChatRequestRef.current) return;
    const req = activeChatRequestRef.current;
    const toolAuth = pendingToolAuth;

    setIsToolAuthModalOpen(false);
    setIsProcessingSequence(true);
    setCurrentState('PROCESSING');

    try {
      const response = await apiClient.sendChatMessage({
        message: req.message,
        history: req.history,
        conversationId,
        sessionAuthorizations: sessionToolAuthorizations,
        isAutonomousTask: toolAuth.isAutonomousTask,
        taskId: toolAuth.taskId,
        authorizationDecision: 'DENY',
        stepId: toolAuth.stepId,
        rejectedToolCall: {
          tool: toolAuth.tool,
          arguments: toolAuth.arguments,
          toolCallId: (toolAuth as any).toolCallId,
          reason: 'User explicitly denied authorization in Security Clearance Gate.',
        },
      });
      await processChatResponse(response);
    } catch (err: any) {
      handleChatError(err);
    } finally {
      setPendingToolAuth(null);
    }
  };

  const handleCancelToolAuth = () => {
    setIsToolAuthModalOpen(false);
    setPendingToolAuth(null);
    setCurrentState('IDLE');
    setIsProcessingSequence(false);
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'SYSTEM',
        text: 'Tool execution clearance cancelled by user. Operation aborted.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // Message transmission & neural sequence with real backend routing
  const handleSendMessage = async (text: string, attachedFiles?: AttachedFile[]) => {
    const hasText = Boolean(text.trim());
    const hasFiles = Boolean(attachedFiles && attachedFiles.length > 0);
    if (!hasText && !hasFiles) return;

    // Halt any active speech or recognition
    stopSpeech();
    stopPushToTalk();

    // Auto-inject attached files into Canvas so they can be inspected/edited
    if (attachedFiles && attachedFiles.length > 0) {
      for (const af of attachedFiles) {
        handleOpenInCanvas({ name: af.name, content: af.content });
      }
    }

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'USER',
      text: hasText ? text.trim() : `Attached files: ${attachedFiles?.map(f => f.name).join(', ')}`,
      timestamp: new Date().toLocaleTimeString(),
      attachedFiles: hasFiles ? attachedFiles : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessingSequence(true);

    // Initial cognitive state transition: LISTENING -> THINKING -> PROCESSING
    setCurrentState('THINKING');

    // Transition to PROCESSING after 350ms while waiting for OpenRouter response
    const processingTimer = setTimeout(() => {
      setCurrentState('PROCESSING');
    }, 350);

    const historyPayload = messages.slice(-10);
    activeChatRequestRef.current = {
      message: userMsg.text,
      history: historyPayload,
    };

    try {
      // Dispatch to backend encrypted OpenRouter proxy with tool session authorizations & attached files
      const response = await apiClient.sendChatMessage({
        message: userMsg.text,
        history: historyPayload,
        conversationId,
        sessionAuthorizations: sessionToolAuthorizations,
        attachedFiles,
      });

      clearTimeout(processingTimer);
      await processChatResponse(response);
    } catch (err: any) {
      clearTimeout(processingTimer);
      handleChatError(err);
    }
  };

  // -------------------------------------------------------------
  // REAL VOICE INPUT (SPEECH RECOGNITION) WORKFLOW
  // -------------------------------------------------------------

  useEffect(() => {
    if (isListening && currentState !== 'LISTENING') {
      setCurrentState('LISTENING');
    } else if (!isListening && currentState === 'LISTENING') {
      setCurrentState('IDLE');
    }
  }, [isListening, currentState]);

  useEffect(() => {
    if (voiceError) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'SYSTEM',
          text: voiceError,
          timestamp: new Date().toLocaleTimeString(),
          isError: true,
        },
      ]);
    }
  }, [voiceError]);

  // Handles clicking the microphone button synchronously (preserving browser user activation)
  const handleStartVoiceInput = () => {
    stopSpeech();

    const config = systemConfigRef.current;
    const micPermission = config?.permissions?.microphone || 'ASK';

    if (micPermission === 'DENY') {
      setCurrentState('IDLE');
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'SYSTEM',
          text: 'Microphone permission denied.',
          timestamp: new Date().toLocaleTimeString(),
          isError: true,
        },
      ]);
      return;
    }

    if (micPermission === 'ASK' && !sessionMicGranted) {
      setIsPermissionModalOpen(true);
      return;
    }

    // ALLOW mode or granted in session -> launch immediately
    startPushToTalk();
  };

  const handleStopVoiceInput = () => {
    stopPushToTalk();
  };

  // Permission Prompt Handlers
  const handleAllowSession = () => {
    setSessionMicGranted(true);
    setIsPermissionModalOpen(false);
    startPushToTalk();
  };

  const handleAlwaysAllow = async () => {
    setSessionMicGranted(true);
    setIsPermissionModalOpen(false);
    startPushToTalk();

    try {
      const cfg = systemConfigRef.current || (await apiClient.getConfig());
      await apiClient.updateConfigSection('permissions', {
        ...cfg.permissions,
        microphone: 'ALLOW',
      });
      refreshConfig();
    } catch (err) {
      console.warn('Failed to persist microphone permission:', err);
    }
  };

  const handleDenyPermission = async () => {
    setIsPermissionModalOpen(false);
    setCurrentState('IDLE');
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'SYSTEM',
        text: 'Microphone permission denied.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true,
      },
    ]);

    try {
      const cfg = systemConfigRef.current || (await apiClient.getConfig());
      await apiClient.updateConfigSection('permissions', {
        ...cfg.permissions,
        microphone: 'DENY',
      });
      refreshConfig();
    } catch (err) {
      console.warn('Failed to update permission to DENY:', err);
    }
  };

  const latestCognitiveTrace = [...messages]
    .reverse()
    .find((m) => m.cognitiveTrace && m.cognitiveTrace.length > 0)
    ?.cognitiveTrace;

  return (
    <main
      id="super-ai-command-center"
      className="relative w-screen h-screen overflow-hidden bg-[#050505] text-[#FFFFFF] flex flex-col justify-between select-none"
    >
      {/* 1. Sleek Interface radial canvas & tactical grid */}
      <div className="sleek-canvas absolute inset-0 pointer-events-none" />
      <div className="sleek-grid absolute inset-0 pointer-events-none opacity-25" />
      <div className="scanlines absolute inset-0 z-10 pointer-events-none opacity-20" />

      {/* 2. Top HUD Navigation Bar */}
      <TopNavigation
        currentState={currentState}
        onOpenControlPanel={handleOpenControlPanel}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        isCanvasOpen={isCanvasOpen}
        onToggleCanvas={() => setIsCanvasOpen(!isCanvasOpen)}
      />

      {/* 3. Center Stage: Real-Time 3D Holographic AI Core */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* ── HOLOGRAM FACE (active) ── comment this out and restore AICore3D below to switch back */}
        {/*
        <div style={{ width: '100%', height: '500px' }}>
          <HologramScene state={currentState} isSpeaking={isSpeakingFlag} radarData={radarData} micVolume={micVolume} />
        </div>
        */}
        {/* ── AICore3D (original — commented out) ── */}
        <AICore3D state={currentState} onGlitchEnd={handleGlitchEnd} />
      </div>

      {/* 4. Left Side: Core Telemetry & Status HUD Panel (HIDDEN per user request) */}
      {/*
      <SideTelemetryPanel
        state={currentState}
        collapsed={leftPanelCollapsed}
        onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        latestTrace={latestCognitiveTrace}
      />
      */}

      {/* 5. Right Side: Dialogue Feed & Event Log */}
      <ActivityFeed
        messages={messages}
        currentState={currentState}
        collapsed={rightPanelCollapsed}
        onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        onOpenInCanvas={handleOpenInCanvas}
      />

      {/* 6. Bottom Dock: State Switcher Controller & Futuristic Chat Input */}
      <div className="relative z-20 flex flex-col items-center justify-end w-full pointer-events-none pb-2">
        {/* State Controller (Manual state switcher for testing) */}
        <div className="pointer-events-auto mb-2 w-full max-w-2xl px-4">
          <StateController
            currentState={currentState}
            onStateChange={(newState) => setCurrentState(newState)}
          />
        </div>

        {/* Futuristic Command Input */}
        <div className="pointer-events-auto w-full">
          <ChatInputArea
            currentState={currentState}
            onStateChange={(newState) => setCurrentState(newState)}
            onSendMessage={handleSendMessage}
            onOpenInCanvas={handleOpenInCanvas}
            isStreaming={isProcessingSequence}
            onStartVoiceInput={handleStartVoiceInput}
            onStopVoiceInput={handleStopVoiceInput}
            onStopSpeaking={handleStopSpeaking}
            voiceTranscript={voiceTranscript}
            isListening={isListening}
            isLiveVoice={isLiveVoice}
            onToggleLiveVoice={handleToggleLiveVoice}
          />
        </div>
      </div>

      {/* 7. Admin Control Panel Modal (API Keys, Models, Routing, Permissions, Security) */}
      <ControlPanelModal
        isOpen={isControlPanelOpen}
        onClose={() => {
          setIsControlPanelOpen(false);
          refreshConfig();
        }}
        defaultSection={controlPanelSection}
        conversationId={conversationId}
      />

      {/* 8. UI Security Permission Clearance Prompt */}
      <PermissionPromptModal
        isOpen={isPermissionModalOpen}
        onAllowSession={handleAllowSession}
        onAlwaysAllow={handleAlwaysAllow}
        onDeny={handleDenyPermission}
        onCancel={() => setIsPermissionModalOpen(false)}
      />

      {/* 9. Tool Execution Security Clearance Gate Modal */}
      <ToolAuthorizationModal
        isOpen={isToolAuthModalOpen}
        pendingAuth={pendingToolAuth}
        onApprove={handleApproveTool}
        onAuthorizeSession={handleAuthorizeToolForSession}
        onAuthorizeTask={handleAuthorizeToolForTask}
        onReject={handleRejectTool}
        onCancel={handleCancelToolAuth}
      />

      {/* 10. Interactive Live Canvas Studio (Code Editor & Real-Time Preview Sandbox) */}
      <LiveCanvasStudio
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        files={canvasFiles}
        activeFileId={activeCanvasFileId}
        onSelectFile={handleSelectCanvasFile}
        onUpdateFileContent={handleUpdateCanvasFileContent}
        onCreateFile={handleCreateCanvasFile}
        onDeleteFile={handleDeleteCanvasFile}
        onRenameFile={handleRenameCanvasFile}
        onUploadFiles={handleUploadCanvasFiles}
        onAskAi={handleCanvasAiPrompt}
        isAiGenerating={isCanvasAiGenerating}
        viewMode={canvasViewMode}
        onViewModeChange={setCanvasViewMode}
        isFullscreen={isCanvasFullscreen}
        onToggleFullscreen={() => setIsCanvasFullscreen(!isCanvasFullscreen)}
      />
    </main>
  );
}

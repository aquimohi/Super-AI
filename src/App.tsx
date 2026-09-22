/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AIState, ChatMessage, ControlPanelSection, PendingToolAuthorization } from './types';
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
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Halt any active speech or recognition
    stopSpeech();
    stopPushToTalk();

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'USER',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
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
      message: text.trim(),
      history: historyPayload,
    };

    try {
      // Dispatch to backend encrypted OpenRouter proxy with tool session authorizations
      const response = await apiClient.sendChatMessage({
        message: text.trim(),
        history: historyPayload,
        conversationId,
        sessionAuthorizations: sessionToolAuthorizations,
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
    </main>
  );
}

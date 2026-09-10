import React, { useState, useEffect, useCallback } from 'react';
import {
  ControlPanelSection,
  StoredApiKey,
  SystemConfig,
} from '../../types';
import { apiClient } from '../../services/apiClient';
import { DashboardSection } from './DashboardSection';
import { ApiKeysSection } from './ApiKeysSection';
import { ModelsSection } from './ModelsSection';
import { RoutingSection } from './RoutingSection';
import { PermissionsSection } from './PermissionsSection';
import { VoiceSection } from './VoiceSection';
import { MemorySection } from './MemorySection';
import { ToolsSection } from './ToolsSection';
import { ComputerControlSection } from './ComputerControlSection';
import { BrowserControlSection } from './BrowserControlSection';
import { CognitiveEngineSection } from './CognitiveEngineSection';
import { SkillsSection } from './SkillsSection';
import { AutonomousTaskSection } from './AutonomousTaskSection';
import { RecoveryObservabilitySection } from './RecoveryObservabilitySection';
import { SecuritySection } from './SecuritySection';
import {
  LayoutDashboard,
  Key,
  Cpu,
  Shuffle,
  Shield,
  Brain,
  Sparkles,
  Workflow,
  RotateCcw,
  Mic,
  Database,
  Wrench,
  Monitor,
  Globe,
  Lock,
  X,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface ControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: ControlPanelSection;
  conversationId?: string;
}

const NAV_ITEMS: Array<{
  id: ControlPanelSection;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'api-keys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
  { id: 'models', label: 'Models', icon: <Cpu className="w-4 h-4" /> },
  { id: 'routing', label: 'AI Routing', icon: <Shuffle className="w-4 h-4" /> },
  { id: 'cognitive-engine', label: 'Cognitive Engine', icon: <Brain className="w-4 h-4" />, badge: 'MULTI-AGENT' },
  { id: 'skills', label: 'Skills Registry', icon: <Sparkles className="w-4 h-4" />, badge: 'V1' },
  { id: 'autonomous-task', label: 'Autonomous Tasks', icon: <Workflow className="w-4 h-4" />, badge: 'LOOP V1' },
  { id: 'recovery-observability', label: 'Recovery & Observability', icon: <RotateCcw className="w-4 h-4" />, badge: 'ENGINE' },
  { id: 'permissions', label: 'Permissions', icon: <Shield className="w-4 h-4" /> },
  { id: 'computer-control', label: 'Computer Control', icon: <Monitor className="w-4 h-4" />, badge: 'SAFE V1' },
  { id: 'browser-control', label: 'Browser Control', icon: <Globe className="w-4 h-4" />, badge: 'SAFE V1' },
  { id: 'voice', label: 'Voice Settings', icon: <Mic className="w-4 h-4" /> },
  { id: 'memory', label: 'Memory', icon: <Database className="w-4 h-4" /> },
  { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" /> },
  { id: 'security', label: 'Security & Logs', icon: <Lock className="w-4 h-4" /> },
];

export const ControlPanelModal: React.FC<ControlPanelModalProps> = ({
  isOpen,
  onClose,
  defaultSection = 'api-keys',
  conversationId,
}) => {
  const [activeSection, setActiveSection] = useState<ControlPanelSection>(defaultSection);
  const [keys, setKeys] = useState<StoredApiKey[]>([]);
  const [config, setConfig] = useState<(SystemConfig & { auditLogs: any[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedKeys, fetchedConfig] = await Promise.all([
        apiClient.getKeys(),
        apiClient.getConfig(),
      ]);
      setKeys(fetchedKeys);
      setConfig(fetchedConfig);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend control layer.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (defaultSection) {
        setActiveSection(defaultSection);
      }
    }
  }, [isOpen, defaultSection, loadData]);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn select-text">
      {/* Outer Modal Container */}
      <div
        id="super-ai-control-panel"
        className="relative w-full max-w-5xl h-[92vh] max-h-[850px] rounded-lg border border-[#F2A900]/40 bg-[#050505] shadow-[0_0_50px_rgba(242,169,0,0.15)] flex flex-col overflow-hidden text-stone-200 font-sans"
      >
        {/* Sleek tactical grid & ambient glow */}
        <div className="sleek-grid absolute inset-0 pointer-events-none opacity-20" />

        {/* Modal Header */}
        <header className="relative z-10 flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-[#0a0a0a]/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#F2A900]/10 border border-[#F2A900]/30 flex items-center justify-center text-[#F2A900]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white tracking-widest uppercase">
                  SUPER AI · CONTROL PANEL
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-stone-900 border border-stone-800 text-[#F2A900]">
                  ENCLAVE v4.2
                </span>
              </div>
              <p className="text-[11px] font-mono text-stone-400">
                Encrypted local key manager, model matrix & system security policies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              title="Refresh configuration from backend"
              className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#F2A900]' : ''}`} />
            </button>
            <button
              id="btn-close-control-panel"
              onClick={onClose}
              title="Close Control Panel (Esc)"
              className="p-1.5 rounded bg-stone-900 hover:bg-rose-950/40 text-stone-400 hover:text-rose-400 border border-stone-800 hover:border-rose-800 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Body: Sidebar + Content */}
        <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r border-stone-800 bg-[#080808]/80 p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-xs font-mono tracking-wider text-left transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#F2A900]/15 text-[#F2A900] font-semibold border-l-2 border-l-[#F2A900] shadow-[0_0_12px_rgba(242,169,0,0.15)]'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                  }`}
                >
                  <span className={isActive ? 'text-[#F2A900]' : 'text-stone-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Section Main Viewport */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#050505]/90">
            {error && (
              <div className="mb-4 p-3 rounded text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400 flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={loadData}
                  className="underline hover:text-white cursor-pointer ml-3"
                >
                  Retry
                </button>
              </div>
            )}

            {loading && !config ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-stone-500 space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#F2A900]" />
                <span>Reading encrypted local database...</span>
              </div>
            ) : (
              config && (
                <>
                  {activeSection === 'dashboard' && (
                    <DashboardSection
                      keys={keys}
                      config={config}
                      onNavigate={(s) => setActiveSection(s)}
                    />
                  )}

                  {activeSection === 'api-keys' && (
                    <ApiKeysSection keys={keys} onRefresh={loadData} />
                  )}

                  {activeSection === 'models' && (
                    <ModelsSection
                      initialModels={config.models}
                      onRefresh={loadData}
                    />
                  )}

                  {activeSection === 'routing' && (
                    <RoutingSection
                      initialRouting={config.routing}
                      onRefresh={loadData}
                    />
                  )}

                  {activeSection === 'cognitive-engine' && (
                    <CognitiveEngineSection
                      initialConfig={config.cognitiveEngine}
                      onRefresh={loadData}
                    />
                  )}

                  {activeSection === 'skills' && (
                    <SkillsSection
                      initialSkills={config.skills}
                      onRefresh={loadData}
                    />
                  )}

                  {activeSection === 'autonomous-task' && (
                    <AutonomousTaskSection
                      conversationId={conversationId}
                      onRefresh={loadData}
                    />
                  )}

                  {activeSection === 'recovery-observability' && (
                    <RecoveryObservabilitySection
                      onNotify={(msg) => console.log(msg)}
                    />
                  )}

                  {activeSection === 'permissions' && (
                    <PermissionsSection
                      initialPermissions={config.permissions}
                      onRefresh={loadData}
                    />
                  )}

                  {activeSection === 'voice' && (
                    <VoiceSection
                      initialVoice={config.voice}
                      onRefresh={loadData}
                    />
                  )}

                  {activeSection === 'memory' && (
                    <MemorySection
                      initialMemory={config.memory}
                      conversationId={conversationId}
                      onRefresh={loadData}
                    />
                  )}

                  {activeSection === 'tools' && <ToolsSection />}

                  {activeSection === 'computer-control' && (
                    <ComputerControlSection onRefresh={loadData} />
                  )}

                  {activeSection === 'browser-control' && (
                    <BrowserControlSection onRefresh={loadData} />
                  )}

                  {activeSection === 'security' && (
                    <SecuritySection
                      initialSecurity={config.security}
                      auditLogs={config.auditLogs || []}
                      onRefresh={loadData}
                    />
                  )}
                </>
              )
            )}
          </main>
        </div>

        {/* Modal Footer */}
        <footer className="relative z-10 px-5 py-2.5 border-t border-stone-800 bg-[#0a0a0a] flex items-center justify-between text-[11px] font-mono text-stone-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ENCLAVE: AES-256 SECURED LOCAL PERSISTENCE</span>
          </div>
          <div>PRESS ESC TO RETURN TO COMMAND CENTER</div>
        </footer>
      </div>
    </div>
  );
};

import React from 'react';
import { ChatMessage, AIState } from '../types';
import { Terminal, Shield, Sparkles, ChevronRight, ChevronLeft, Bot, User, Wrench, Database, Brain, Code2 } from 'lucide-react';

interface ActivityFeedProps {
  messages: ChatMessage[];
  currentState: AIState;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  messages,
  currentState,
  collapsed,
  onToggleCollapse,
}) => {
  // Find latest memory event if any
  const latestMemoryEvent = [...messages]
    .reverse()
    .find((m) => m.memoryEvents && m.memoryEvents.length > 0)
    ?.memoryEvents?.[0];

  return (
    <aside
      id="activity-feed-panel"
      className={`fixed right-4 top-24 bottom-28 z-20 flex transition-all duration-300 pointer-events-none ${
        collapsed ? 'translate-x-[calc(100%-12px)]' : 'translate-x-0'
      }`}
    >
      {/* Collapse Toggle Tab */}
      <button
        id="toggle-activity-btn"
        onClick={onToggleCollapse}
        className="pointer-events-auto self-center -mr-px px-1 py-4 rounded-l-md hud-panel border border-r-0 border-[#FFFFFF]/30 text-[#FFFFFF] hover:text-white transition-colors cursor-pointer"
        title={collapsed ? 'Expand Memory Matrix Logs' : 'Collapse Memory Matrix Logs'}
      >
        {collapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      <div className="hud-panel rounded-xl w-72 sm:w-84 h-full p-4 flex flex-col justify-between overflow-hidden pointer-events-auto border border-[#FFFFFF]/20 bg-black/50 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#FFFFFF]/20">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#FFFFFF]" />
            <span className="text-[11px] font-mono tracking-[0.2em] text-[#FFFFFF] font-bold uppercase">
              Memory Matrix Logs
            </span>
          </div>
          {latestMemoryEvent ? (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-600 text-emerald-400 font-bold animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {latestMemoryEvent.type === 'MEMORY_STORED'
                ? '[ MEMORY STORED ]'
                : latestMemoryEvent.type === 'MEMORY_RETRIEVED'
                ? '[ MEMORY RETRIEVED ]'
                : '[ WORKING MEMORY UPDATED ]'}
            </span>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 text-[#FFFFFF]">
              LIVE FEED
            </span>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 my-3 overflow-y-auto space-y-2.5 pr-1">
          {messages.map((msg) => {
            const isAI = msg.sender === 'SUPER_AI';
            const isSystem = msg.sender === 'SYSTEM';
            const isError = msg.isError;

            return (
              <div
                key={msg.id}
                className={`p-2.5 rounded-lg border text-xs transition-all ${
                  isError
                    ? 'bg-rose-950/40 border-rose-600/70 text-rose-300'
                    : isAI
                    ? 'bg-[#FFFFFF]/10 border-[#FFFFFF]/30 text-[#FFFFFF]'
                    : isSystem
                    ? 'bg-black/50 border-[#FFFFFF]/15 text-[#FFFFFF]/70 font-mono text-[11px]'
                    : 'bg-black/60 border-[#FFFFFF]/40 text-[#FFFFFF] ml-3'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    {isAI ? (
                      <Bot className="w-3.5 h-3.5 text-[#FFFFFF]" />
                    ) : isSystem ? (
                      <Shield className="w-3 h-3 text-[#FFFFFF]/70" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-[#FFFFFF]" />
                    )}
                    <span className="font-mono font-bold text-[10px] tracking-wider text-[#FFFFFF]">
                      {msg.sender === 'SUPER_AI' ? 'SUPER AI' : msg.sender}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono opacity-50 text-[#FFFFFF]">
                    [{msg.timestamp}]
                  </span>
                </div>
                <p className="font-mono leading-relaxed text-[11px] text-[#FFFFFF]/85 whitespace-pre-wrap">
                  {msg.text}
                </p>

                {/* Memory Events Indicator Badges */}
                {msg.memoryEvents && msg.memoryEvents.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-[#FFFFFF]/20 space-y-1">
                    <div className="text-[9px] font-mono text-[#FFFFFF]/60 uppercase tracking-widest flex items-center gap-1">
                      <Database className="w-2.5 h-2.5 text-[#FFFFFF]" />
                      <span>Memory Activity ({msg.memoryEvents.length})</span>
                    </div>
                    {msg.memoryEvents.map((mev, i) => {
                      const isStored = mev.type === 'MEMORY_STORED';
                      const isRetrieved = mev.type === 'MEMORY_RETRIEVED';
                      const isDeleted = mev.type === 'MEMORY_DELETED';

                      return (
                        <div
                          key={i}
                          className="p-1.5 rounded bg-black/60 border border-stone-800 text-[9px] font-mono space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                isStored
                                  ? 'text-amber-300 bg-amber-950/60 border border-amber-700/60'
                                  : isRetrieved
                                  ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-700/60'
                                  : isDeleted
                                  ? 'text-rose-300 bg-rose-950/60 border border-rose-700/60'
                                  : 'text-sky-300 bg-sky-950/60 border border-sky-700/60'
                              }`}
                            >
                              {isStored
                                ? '[ MEMORY STORED ]'
                                : isRetrieved
                                ? '[ MEMORY RETRIEVED ]'
                                : isDeleted
                                ? '[ MEMORY DELETED ]'
                                : '[ WORKING MEMORY UPDATED ]'}
                            </span>
                            <span className="text-[8px] text-stone-500">{mev.timestamp}</span>
                          </div>
                          <div className="text-stone-300 truncate max-w-full font-mono text-[9px]">
                            {mev.summary}
                          </div>
                          {mev.details && (
                            <div className="text-stone-500 text-[8px] font-mono truncate">
                              {mev.details}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tool Activities Log */}
                {msg.toolActivities && msg.toolActivities.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-[#FFFFFF]/20 space-y-1">
                    <div className="text-[9px] font-mono text-[#FFFFFF]/60 uppercase tracking-widest flex items-center gap-1">
                      <Wrench className="w-2.5 h-2.5 text-[#FFFFFF]" />
                      <span>Executed Tools ({msg.toolActivities.length})</span>
                    </div>
                    {msg.toolActivities.map((act, i) => {
                      const isSandbox = act.tool === 'execute_code';

                      // Parse sandbox result from the execution/result strings
                      let sandboxData: {
                        language?: string;
                        output?: string;
                        error?: string;
                        exitCode?: number | null;
                        timedOut?: boolean;
                        executionMs?: number;
                      } | null = null;

                      if (isSandbox) {
                        try {
                          // result field may contain JSON from displaySummary
                          // Try to extract from result string
                          const langMatch = act.result?.match(/\b(python|javascript)\b/i);
                          const timeMatch = act.result?.match(/(\d+)ms/);
                          const timedOut = act.result?.toLowerCase().includes('timeout');
                          const exitMatch = act.result?.match(/exit\s+(\d+)/i);
                          sandboxData = {
                            language: langMatch?.[1]?.toLowerCase(),
                            executionMs: timeMatch ? parseInt(timeMatch[1]) : undefined,
                            timedOut,
                            exitCode: exitMatch ? parseInt(exitMatch[1]) : timedOut ? null : 0,
                            output: act.permission === 'ALLOWED' && !timedOut
                              ? act.result?.split('\nStderr:')[0]?.replace(/^.*?Output:\s*/s, '').trim()
                              : undefined,
                            error: act.result?.includes('Stderr:')
                              ? act.result.split('Stderr:')[1]?.trim()
                              : undefined,
                          };
                        } catch { /* fallback to generic display */ }
                      }

                      return isSandbox ? (
                        // === SANDBOX EXECUTION OUTPUT BLOCK ===
                        <div
                          key={i}
                          className="p-2 rounded bg-black/80 border border-cyan-900/60 text-[9px] font-mono space-y-1.5"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Code2 className="w-3 h-3 text-cyan-400" />
                              <span className="text-cyan-300 font-bold text-[10px]">
                                {sandboxData?.language === 'python' ? 'Python 🐍' : sandboxData?.language === 'javascript' ? 'JavaScript ⚡' : 'Code'} Sandbox
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {sandboxData?.executionMs != null && (
                                <span className="text-[8px] text-stone-500">{sandboxData.executionMs}ms</span>
                              )}
                              <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${
                                sandboxData?.timedOut
                                  ? 'text-amber-300 bg-amber-950/60 border border-amber-700/50'
                                  : act.permission === 'DENIED'
                                  ? 'text-red-400 bg-red-950/60 border border-red-700/50'
                                  : sandboxData?.exitCode === 0
                                  ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-700/50'
                                  : 'text-rose-300 bg-rose-950/60 border border-rose-700/50'
                              }`}>
                                {sandboxData?.timedOut ? '⏱ TIMEOUT' : act.permission === 'DENIED' ? '🔒 DENIED' : sandboxData?.exitCode === 0 ? '✅ EXIT 0' : `❌ EXIT ${sandboxData?.exitCode ?? '?'}`}
                              </span>
                            </div>
                          </div>

                          {/* Execution summary */}
                          <div className="text-stone-500 text-[8px] truncate" title={act.execution}>
                            {act.execution}
                          </div>

                          {/* stdout output */}
                          {act.permission === 'ALLOWED' && (
                            <div className="rounded bg-black/60 border border-emerald-900/50 p-1.5">
                              <div className="text-[8px] text-emerald-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                stdout
                              </div>
                              <pre className="text-emerald-300 text-[9px] whitespace-pre-wrap break-words max-h-24 overflow-y-auto leading-relaxed">
                                {/* Extract output from displaySummary */}
                                {act.result
                                  ?.split('\n')
                                  .filter((l) => !l.startsWith('EXIT') && !l.startsWith('TIMEOUT') && !l.toLowerCase().includes('stderr'))
                                  .join('\n')
                                  .trim() || '(no output)'}
                              </pre>
                            </div>
                          )}

                          {/* DENIED notice */}
                          {act.permission === 'DENIED' && (
                            <div className="rounded bg-rose-950/30 border border-rose-800/50 p-1.5 text-[9px] text-rose-300">
                              🔒 Execution blocked — user denied sandbox permission.
                            </div>
                          )}

                          {/* Timeout notice */}
                          {sandboxData?.timedOut && (
                            <div className="rounded bg-amber-950/30 border border-amber-800/50 p-1.5 text-[9px] text-amber-300">
                              ⏱ Process terminated — exceeded 5s timeout limit.
                            </div>
                          )}
                        </div>
                      ) : (
                        // === GENERIC TOOL ACTIVITY BLOCK ===
                        <div
                          key={i}
                          className="p-1.5 rounded bg-black/50 border border-stone-800 text-[9px] font-mono space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[#FFFFFF]">
                            <span className="font-bold">{act.tool}</span>
                            <span
                              className={`px-1 py-0.2 rounded text-[8px] uppercase ${
                                act.permission === 'ALLOWED'
                                  ? 'text-emerald-400 bg-emerald-950/40'
                                  : act.permission === 'ASKED'
                                  ? 'text-amber-400 bg-amber-950/40'
                                  : 'text-red-400 bg-red-950/40'
                              }`}
                            >
                              {act.permission}
                            </span>
                          </div>
                          <div className="text-stone-400 truncate max-w-full font-sans" title={act.execution}>
                            {act.execution}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Multi-Agent Cognitive Trace */}
                {msg.cognitiveTrace && msg.cognitiveTrace.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-[#FFFFFF]/20 space-y-1">
                    <div className="text-[9px] font-mono text-[#FFFFFF]/80 uppercase tracking-widest flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Brain className="w-2.5 h-2.5 text-[#FFFFFF]" />
                        <span>COGNITIVE TRACE</span>
                      </div>
                      {msg.judgeEvaluation && (
                        <span
                          className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                            msg.judgeEvaluation.verdict === 'APPROVED'
                              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-700/50'
                              : msg.judgeEvaluation.verdict === 'REVISED'
                              ? 'text-amber-400 bg-amber-950/60 border border-amber-700/50'
                              : 'text-stone-400 bg-stone-900 border border-stone-800'
                          }`}
                          title={msg.judgeEvaluation.critique}
                        >
                          JUDGE: {msg.judgeEvaluation.verdict}
                          {msg.judgeEvaluation.score ? ` (${msg.judgeEvaluation.score}%)` : ''}
                        </span>
                      )}
                    </div>
                    <div className="p-1.5 rounded bg-black/60 border border-[#FFFFFF]/20 space-y-1 font-mono text-[9px]">
                      {msg.cognitiveTrace.map((tr) => (
                        <div key={tr.id} className="flex items-start gap-1 leading-tight">
                          <span
                            className={`font-bold ${
                              tr.agent === 'PLANNER'
                                ? 'text-[#FFFFFF]'
                                : tr.agent === 'SKILL'
                                ? 'text-purple-400'
                                : tr.agent === 'SPECIALIST'
                                ? 'text-cyan-400'
                                : tr.agent === 'JUDGE'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            [{tr.agent}]
                          </span>
                          <span className="text-stone-300 break-words">{tr.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.modelUsed && (
                  <div className="mt-1.5 pt-1 border-t border-[#FFFFFF]/20 flex flex-col gap-0.5 text-[9px] font-mono text-[#FFFFFF]/70">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#FFFFFF]">
                        TASK: {msg.taskType || 'GENERAL'}
                      </span>
                      <span className="text-[8px] opacity-75 uppercase">
                        PROVIDER: {msg.providerUsed?.toUpperCase() || 'OPENROUTER'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#FFFFFF]/60">
                      <span className="truncate max-w-[150px]" title={msg.modelUsed}>
                        MODEL: {msg.modelUsed}
                      </span>
                      {msg.latencyMs ? (
                        <span className="opacity-70 text-[8px]">{msg.latencyMs}ms</span>
                      ) : null}
                    </div>
                    {msg.fallbackOccurred && (
                      <div className="text-amber-400 text-[8px] flex items-center gap-1 font-semibold">
                        <span>⚠ FALLBACK ROUTE ENGAGED</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Power Usage Bar from Sleek Interface Theme */}
        <div className="pt-3 border-t border-[#FFFFFF]/20">
          <div className="flex justify-between items-center text-[10px] uppercase opacity-50 font-mono text-[#FFFFFF]">
            <span>Power Usage</span>
            <span className="opacity-80">65%</span>
          </div>
          <div className="w-full h-1 bg-[#FFFFFF]/10 mt-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-[#FFFFFF] w-[65%]" />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono opacity-40 text-[#FFFFFF]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF] animate-pulse" />
              <span>NEURAL ENCRYPTION</span>
            </div>
            <span>SEC-LVL 5</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

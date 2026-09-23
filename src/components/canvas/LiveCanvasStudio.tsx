import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CanvasFile, CanvasLanguage } from '../../types';
import {
  Code2,
  Eye,
  Columns,
  Play,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Upload,
  Trash2,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Check,
  RotateCcw,
  FileCode,
  FileText,
  AlertCircle,
  Terminal,
  ChevronDown,
  Wand2,
  FileUp,
} from 'lucide-react';

interface LiveCanvasStudioProps {
  isOpen: boolean;
  onClose: () => void;
  files: CanvasFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onUpdateFileContent: (id: string, content: string) => void;
  onCreateFile: (name: string, language: CanvasLanguage, content?: string) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onAskAi: (prompt: string, activeFile: CanvasFile) => Promise<void>;
  isAiGenerating?: boolean;
  viewMode: 'split' | 'editor' | 'preview';
  onViewModeChange: (mode: 'split' | 'editor' | 'preview') => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const LANGUAGE_EXTENSIONS: Record<string, CanvasLanguage> = {
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

export const LiveCanvasStudio: React.FC<LiveCanvasStudioProps> = ({
  isOpen,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onUpdateFileContent,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onUploadFiles,
  onAskAi,
  isAiGenerating = false,
  viewMode,
  onViewModeChange,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || files[0],
    [files, activeFileId]
  );

  const [aiPrompt, setAiPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: 'log' | 'error' | 'warn'; msg: string; time: string }>>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [newFileMenuOpen, setNewFileMenuOpen] = useState(false);
  const [editingFileName, setEditingFileName] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll textarea sync
  const [cursorLine, setCursorLine] = useState(1);

  // Line count array for gutter
  const lineCount = useMemo(() => {
    if (!activeFile?.content) return 1;
    return activeFile.content.split('\n').length;
  }, [activeFile?.content]);

  // Bundle HTML + CSS + JS for live iframe preview
  const compiledHtml = useMemo(() => {
    if (!files.length) return '';

    // Find HTML source
    let htmlContent = '';
    const htmlFile = files.find((f) => f.name.toLowerCase().endsWith('.html')) || (activeFile?.language === 'html' ? activeFile : null);

    if (htmlFile) {
      htmlContent = htmlFile.content;
    } else if (activeFile?.language === 'markdown') {
      // Basic markdown parser for preview
      const escaped = activeFile.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; background: #0c0d12; color: #e2e8f0; line-height: 1.6; }
        h1,h2,h3 { color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 0.3rem; }
        code { background: #1e293b; color: #a5f3fc; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; }
        pre { background: #111827; border: 1px solid #1f2937; padding: 1rem; border-radius: 8px; overflow-x: auto; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 3px solid #38bdf8; padding-left: 1rem; color: #94a3b8; font-style: italic; }
      </style></head><body><pre style="white-space: pre-wrap; font-family: inherit;">${escaped}</pre></body></html>`;
      return htmlContent;
    } else {
      // Create minimal HTML canvas container for JS/CSS or text
      htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Super AI Canvas</title><style>
        body { margin: 0; padding: 2rem; font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; }
      </style></head><body><div id="app"></div></body></html>`;
    }

    // Collect all CSS files
    const cssBlocks = files
      .filter((f) => f.language === 'css' || f.name.toLowerCase().endsWith('.css'))
      .map((f) => `<style data-filename="${f.name}">\n${f.content}\n</style>`)
      .join('\n');

    // Collect all JS/TS files
    const jsBlocks = files
      .filter((f) => f.language === 'javascript' || f.name.toLowerCase().endsWith('.js'))
      .map((f) => `<script data-filename="${f.name}">\ntry {\n${f.content}\n} catch(err) {\n  window.parent.postMessage({ type: 'CANVAS_CONSOLE', level: 'error', message: err.toString() }, '*');\n}\n</script>`)
      .join('\n');

    // Inject console capturing bridge
    const bridgeScript = `
      <script>
        (function() {
          const _log = console.log;
          const _err = console.error;
          const _warn = console.warn;
          console.log = function(...args) {
            window.parent.postMessage({ type: 'CANVAS_CONSOLE', level: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
            _log.apply(console, args);
          };
          console.error = function(...args) {
            window.parent.postMessage({ type: 'CANVAS_CONSOLE', level: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
            _err.apply(console, args);
          };
          console.warn = function(...args) {
            window.parent.postMessage({ type: 'CANVAS_CONSOLE', level: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
            _warn.apply(console, args);
          };
          window.onerror = function(msg, url, line) {
            window.parent.postMessage({ type: 'CANVAS_CONSOLE', level: 'error', message: msg + ' (Line ' + line + ')' }, '*');
          };
        })();
      </script>
    `;

    // Inject styles in <head> and scripts in <body>
    let combined = htmlContent;
    if (combined.includes('</head>')) {
      combined = combined.replace('</head>', `${bridgeScript}\n${cssBlocks}\n</head>`);
    } else {
      combined = `${bridgeScript}\n${cssBlocks}\n${combined}`;
    }

    if (combined.includes('</body>')) {
      combined = combined.replace('</body>', `${jsBlocks}\n</body>`);
    } else {
      combined = `${combined}\n${jsBlocks}`;
    }

    return combined;
  }, [files, activeFile]);

  // Listen to iframe console events
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CANVAS_CONSOLE') {
        setConsoleLogs((prev) => [
          ...prev.slice(-49),
          {
            type: e.data.level || 'log',
            msg: e.data.message || '',
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle Tab key indentation in editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!textareaRef.current || !activeFile) return;

      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const value = textarea.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onUpdateFileContent(activeFile.id, newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value.substring(0, textareaRef.current.selectionStart);
    const line = text.split('\n').length;
    setCursorLine(line);
  };

  const handleCopyCode = () => {
    if (!activeFile?.content) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([compiledHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleRevert = () => {
    if (!activeFile || !activeFile.originalContent) return;
    onUpdateFileContent(activeFile.id, activeFile.originalContent);
  };

  const handleAiSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim() || !activeFile || isAiGenerating) return;

    const promptText = aiPrompt.trim();
    setAiPrompt('');
    await onAskAi(promptText, activeFile);
  };

  const handleTacticalPreset = (presetText: string) => {
    if (!activeFile || isAiGenerating) return;
    onAskAi(presetText, activeFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const startRenaming = (file: CanvasFile) => {
    setEditingFileName(file.id);
    setRenameInput(file.name);
  };

  const finishRenaming = (fileId: string) => {
    if (renameInput.trim()) {
      onRenameFile(fileId, renameInput.trim());
    }
    setEditingFileName(null);
  };

  if (!isOpen) return null;

  return (
    <div
      id="live-canvas-studio"
      className={`fixed z-30 transition-all duration-300 flex flex-col bg-[#07090e] border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl text-white ${
        isFullscreen
          ? 'inset-0'
          : 'top-16 bottom-4 right-4 left-4 lg:left-auto lg:w-[68vw] xl:w-[62vw] rounded-2xl overflow-hidden'
      }`}
    >
      {/* ── Top Header & HUD Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-500/20 bg-[#090d16]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              LIVE CANVAS STUDIO
            </span>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hidden sm:inline">
            REAL-TIME WORKSPACE
          </span>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2">
          {/* View Modes */}
          <div className="flex items-center p-0.5 rounded-lg border border-cyan-500/30 bg-black/40 text-xs font-mono">
            <button
              onClick={() => onViewModeChange('editor')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all cursor-pointer ${
                viewMode === 'editor'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Code Editor Only"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CODE</span>
            </button>
            <button
              onClick={() => onViewModeChange('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Split View (Editor + Live Preview)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SPLIT</span>
            </button>
            <button
              onClick={() => onViewModeChange('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Live Preview Only"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PREVIEW</span>
            </button>
          </div>

          {/* Quick Actions */}
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded border border-cyan-500/20 bg-black/40 text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-500/50 transition-all cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownloadFile}
            className="p-1.5 rounded border border-cyan-500/20 bg-black/40 text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-500/50 transition-all cursor-pointer"
            title={`Download ${activeFile?.name || 'File'}`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded border border-cyan-500/20 bg-black/40 text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-500/50 transition-all cursor-pointer"
            title="Open Live Preview in New Browser Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded border border-cyan-500/20 bg-black/40 text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-500/50 transition-all cursor-pointer hidden sm:block"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:border-rose-500 transition-all cursor-pointer ml-1"
            title="Close Canvas"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Multi-File Tabs Strip ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-cyan-500/20 bg-black/60 overflow-x-auto scrollbar-none shrink-0 gap-2">
        <div className="flex items-center gap-1.5">
          {files.map((file) => {
            const isActive = file.id === activeFile?.id;
            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`group flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono transition-all cursor-pointer border select-none ${
                  isActive
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />

                {editingFileName === file.id ? (
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onBlur={() => finishRenaming(file.id)}
                    onKeyDown={(e) => e.key === 'Enter' && finishRenaming(file.id)}
                    autoFocus
                    className="bg-black/80 border border-cyan-400 px-1 py-0.5 text-xs text-cyan-200 outline-none rounded"
                  />
                ) : (
                  <span
                    onDoubleClick={() => startRenaming(file)}
                    title="Double-click to rename"
                    className="tracking-tight"
                  >
                    {file.name}
                  </span>
                )}

                {file.isModified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_#f59e0b]" title="Modified" />
                )}

                {files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
                    title="Delete File"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* New File Button */}
          <div className="relative">
            <button
              onClick={() => setNewFileMenuOpen(!newFileMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-dashed border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-900/30 font-mono text-xs cursor-pointer transition-colors"
              title="Add New File"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {newFileMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-lg bg-black/95 border border-cyan-500/40 shadow-xl shadow-cyan-950/60 p-1.5 z-40 space-y-1 font-mono text-xs">
                <button
                  onClick={() => {
                    onCreateFile('index.html', 'html', '<!DOCTYPE html>\n<html>\n<head>\n  <title>App</title>\n</head>\n<body>\n  <h1>Hello Super AI</h1>\n</body>\n</html>');
                    setNewFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-cyan-950/80 text-cyan-300 transition-colors"
                >
                  🌐 HTML5 Web Page
                </button>
                <button
                  onClick={() => {
                    onCreateFile('styles.css', 'css', 'body {\n  margin: 0;\n  background: #0d1117;\n  color: #58a6ff;\n  font-family: sans-serif;\n}');
                    setNewFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-cyan-950/80 text-cyan-300 transition-colors"
                >
                  🎨 CSS Stylesheet
                </button>
                <button
                  onClick={() => {
                    onCreateFile('script.js', 'javascript', '// Super AI Interactive Logic\nconsole.log("Canvas script loaded!");\n');
                    setNewFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-cyan-950/80 text-cyan-300 transition-colors"
                >
                  ⚡ JavaScript Logic
                </button>
                <button
                  onClick={() => {
                    onCreateFile('script.py', 'python', '# Python automation script\nprint("Hello from Super AI Canvas")\n');
                    setNewFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-cyan-950/80 text-cyan-300 transition-colors"
                >
                  🐍 Python Script
                </button>
                <button
                  onClick={() => {
                    onCreateFile('notes.md', 'markdown', '# Project Notes\n\n- [ ] Task 1\n- [ ] Task 2\n');
                    setNewFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-cyan-950/80 text-cyan-300 transition-colors"
                >
                  📝 Markdown Doc
                </button>
              </div>
            )}
          </div>

          {/* Upload File to Canvas */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-cyan-500/20 bg-black/40 text-cyan-300 hover:bg-cyan-950/50 hover:border-cyan-500/40 font-mono text-xs cursor-pointer transition-colors"
            title="Upload Files from PC into Canvas"
          >
            <FileUp className="w-3 h-3" />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Active File Metadata */}
        <div className="hidden md:flex items-center gap-3 text-[10px] font-mono text-gray-400">
          <span>LINES: <strong className="text-cyan-300">{lineCount}</strong></span>
          <span>LANG: <strong className="text-cyan-300 uppercase">{activeFile?.language || 'text'}</strong></span>
          {activeFile?.originalContent && (
            <button
              onClick={handleRevert}
              className="flex items-center gap-1 text-amber-400/80 hover:text-amber-300 transition-colors"
              title="Revert to original file content"
            >
              <RotateCcw className="w-3 h-3" />
              <span>REVERT</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Workspace Body (Editor & Live Preview) ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Code Editor Pane */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div
            className={`flex flex-col h-full bg-[#070a10] relative ${
              viewMode === 'split' ? 'w-1/2 border-r border-cyan-500/20' : 'w-full'
            }`}
          >
            {/* Editor Area with Line Number Gutter */}
            <div className="flex-1 flex overflow-hidden relative font-mono text-xs sm:text-sm">
              {/* Line Numbers Gutter */}
              <div
                className="w-11 sm:w-12 py-3 bg-[#05070c] border-r border-white/10 select-none text-right pr-2.5 text-gray-600 font-mono text-xs leading-relaxed shrink-0 overflow-hidden"
              >
                {Array.from({ length: lineCount }).map((_, i) => {
                  const lineNum = i + 1;
                  const isCur = lineNum === cursorLine;
                  return (
                    <div
                      key={i}
                      className={isCur ? 'text-cyan-400 font-bold bg-cyan-950/40 -mr-2.5 pr-2.5 rounded-l' : ''}
                    >
                      {lineNum}
                    </div>
                  );
                })}
              </div>

              {/* Textarea Code Input */}
              <textarea
                ref={textareaRef}
                value={activeFile?.content || ''}
                onChange={(e) => {
                  if (activeFile) {
                    onUpdateFileContent(activeFile.id, e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleCursorMove}
                onClick={handleCursorMove}
                spellCheck={false}
                placeholder="Paste code or type here..."
                className="flex-1 h-full p-3 bg-transparent text-gray-100 font-mono text-xs sm:text-sm leading-relaxed resize-none outline-none overflow-auto scrollbar-thin scrollbar-thumb-cyan-950 scrollbar-track-transparent selection:bg-cyan-900 selection:text-white"
              />
            </div>
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`flex flex-col h-full bg-black relative ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
          >
            {/* Live Rendered Iframe */}
            <div className="flex-1 relative w-full h-full bg-[#0a0a0d] overflow-hidden">
              <iframe
                id="canvas-live-iframe"
                title="Super AI Live Canvas Preview"
                srcDoc={compiledHtml}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-0 bg-white"
              />

              {/* Live Preview Status Watermark */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 pointer-events-none backdrop-blur-md shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE SANDBOX</span>
              </div>
            </div>

            {/* Bottom Console Drawer */}
            <div className="border-t border-cyan-500/20 bg-[#080b12] text-xs font-mono shrink-0">
              <button
                onClick={() => setShowConsole(!showConsole)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-gray-400 hover:text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300">
                    Console Logs ({consoleLogs.length})
                  </span>
                </div>
                <span className="text-[9px] text-gray-500">
                  {showConsole ? '▼ HIDE' : '▲ SHOW'}
                </span>
              </button>

              {showConsole && (
                <div className="max-h-32 overflow-y-auto p-2.5 bg-black/90 space-y-1 text-[11px]">
                  {consoleLogs.length === 0 ? (
                    <div className="text-gray-500 italic">No console logs or errors emitted yet.</div>
                  ) : (
                    consoleLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 ${
                          log.type === 'error'
                            ? 'text-rose-400 font-bold'
                            : log.type === 'warn'
                            ? 'text-amber-400'
                            : 'text-gray-300'
                        }`}
                      >
                        <span className="text-gray-600 shrink-0">[{log.time}]</span>
                        <span className="break-all">{log.msg}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Canvas AI Copilot Bar ("Un par kaam karne ke liye") ── */}
      <div className="border-t border-cyan-500/30 bg-[#080b14] p-3 shrink-0">
        {/* Quick Tactical Action Chips */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400/70 shrink-0 flex items-center gap-1 mr-1">
            <Wand2 className="w-3 h-3" />
            AI TOOLS:
          </span>
          <button
            onClick={() => handleTacticalPreset(`Active file '${activeFile?.name}' me bugs fix karo aur code clean karo.`)}
            disabled={isAiGenerating}
            className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 cursor-pointer whitespace-nowrap transition-all disabled:opacity-50"
          >
            🐛 Fix Bugs
          </button>
          <button
            onClick={() => handleTacticalPreset(`Active file '${activeFile?.name}' ka visual design aur modern styling improve karo with glowing dark theme.`)}
            disabled={isAiGenerating}
            className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 cursor-pointer whitespace-nowrap transition-all disabled:opacity-50"
          >
            🎨 Polish UI / Styles
          </button>
          <button
            onClick={() => handleTacticalPreset(`Active file '${activeFile?.name}' ki performance optimize karo aur code refactor karo.`)}
            disabled={isAiGenerating}
            className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 cursor-pointer whitespace-nowrap transition-all disabled:opacity-50"
          >
            ⚡ Optimize Code
          </button>
          <button
            onClick={() => handleTacticalPreset(`Active file '${activeFile?.name}' me clear Hindi/English comments add karo explaining every block.`)}
            disabled={isAiGenerating}
            className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 cursor-pointer whitespace-nowrap transition-all disabled:opacity-50"
          >
            📝 Add Comments
          </button>
          <button
            onClick={() => handleTacticalPreset(`Active file '${activeFile?.name}' ko clearly step-by-step explain karo ki yeh kya karta hai.`)}
            disabled={isAiGenerating}
            className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 cursor-pointer whitespace-nowrap transition-all disabled:opacity-50"
          >
            🔍 Explain Code
          </button>
        </div>

        {/* AI Prompt Input Form */}
        <form onSubmit={handleAiSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={
                isAiGenerating
                  ? 'Super AI active file par kaam kar rahi hai...'
                  : `Ask Super AI to edit, style, or add features to ${activeFile?.name || 'this file'}...`
              }
              disabled={isAiGenerating}
              className="w-full bg-black/60 border border-cyan-500/40 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-cyan-200 placeholder:text-gray-500 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.25)] transition-all disabled:opacity-50"
            />
            {isAiGenerating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-cyan-400 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>GENERATING CHANGES...</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!aiPrompt.trim() || isAiGenerating}
            className="px-4 py-2.5 rounded-xl border border-cyan-400 bg-cyan-500 text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">APPLY CHANGES</span>
          </button>
        </form>
      </div>
    </div>
  );
};

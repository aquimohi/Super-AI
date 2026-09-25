import React, { useState, useEffect } from 'react';
import { SmtpEmailClientConfig, SentEmailRecord } from '../../types';
import { apiClient } from '../../services/apiClient';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  Eye,
  EyeOff,
  History,
  Trash2,
  Info,
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';

interface EmailPreset {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  notes: string;
}

const PRESETS: Record<string, EmailPreset> = {
  gmail: {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    notes: 'Requires a Google 16-character App Password (not your normal Google account password).',
  },
  outlook: {
    name: 'Outlook / Office 365',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    notes: 'Use your full Microsoft email and password / app password.',
  },
  sendgrid: {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    notes: 'Set Username to "apikey" and Password to your SendGrid API key.',
  },
  mailgun: {
    name: 'Mailgun',
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    notes: 'Use the SMTP credentials provided in your Mailgun Domain settings.',
  },
};

export const EmailSection: React.FC = () => {
  const [config, setConfig] = useState<SmtpEmailClientConfig>({
    enabled: false,
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: '',
    hasPass: false,
    fromEmail: '',
    fromName: 'Super AI',
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Connection State
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Quick Send Test State
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTestMail, setSendingTestMail] = useState(false);
  const [sendMailResult, setSendMailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email History State
  const [history, setHistory] = useState<SentEmailRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadConfig();
    loadHistory();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getEmailConfig();
      setConfig(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load SMTP settings');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const items = await apiClient.getEmailHistory();
      setHistory(items);
    } catch (err: any) {
      console.warn('Failed to load email history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
    }));
    setTestResult(null);
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setSaveSuccess(false);
    try {
      setLoading(true);
      const payload: any = {
        enabled: config.enabled,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      };
      if (passwordInput.trim().length > 0) {
        payload.pass = passwordInput.trim();
      }

      const updated = await apiClient.updateEmailConfig(payload);
      setConfig(updated);
      setPasswordInput('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save SMTP configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setTestingConnection(true);
    try {
      const payload: any = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
      };
      if (passwordInput.trim().length > 0) {
        payload.pass = passwordInput.trim();
      }
      const res = await apiClient.testEmailConnection(payload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestMail = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      setSendMailResult({ success: false, message: 'Please enter a valid recipient email address' });
      return;
    }
    setSendingTestMail(true);
    setSendMailResult(null);
    try {
      const res = await apiClient.sendEmail({
        to: testRecipient.trim(),
        subject: 'Super AI: SMTP Integration Test',
        text: 'Congratulations! Your SMTP email relay configured in Super AI is working flawlessly.',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; color: #f8fafc;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; letter-spacing: 1px;">SUPER AI &bull; SMTP RELAY</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Automated Diagnostic Verification</p>
            </div>
            <div style="padding: 28px;">
              <h2 style="color: #38bdf8; margin-top: 0;">Transmission Successful ⚡</h2>
              <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                This message confirms that your SMTP credentials configured inside Super AI Control Panel are active, authenticated, and capable of dispatching outgoing emails autonomously.
              </p>
              <div style="background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;"><strong>SMTP Host:</strong> <span style="color: #38bdf8;">${config.host}:${config.port}</span></p>
                <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;"><strong>Sender:</strong> <span style="color: #f1f5f9;">${config.fromName} (${config.fromEmail || config.user})</span></p>
                <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;"><strong>Security:</strong> <span style="color: #10b981;">${config.secure ? 'Implicit TLS (Port 465)' : 'STARTTLS (Port 587)'}</span></p>
              </div>
              <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">Sent autonomously via Super AI Native Transport</p>
            </div>
          </div>
        `,
        fromName: config.fromName,
      });
      setSendMailResult({
        success: true,
        message: res.message || 'Test email dispatched successfully! Check inbox.',
      });
      loadHistory();
    } catch (err: any) {
      setSendMailResult({ success: false, message: err.message || 'Failed to dispatch test email.' });
    } finally {
      setSendingTestMail(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear the sent email audit log?')) return;
    try {
      await apiClient.clearEmailHistory();
      setHistory([]);
    } catch (err: any) {
      alert(err.message || 'Failed to clear history');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#2A2B32] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">SMTP Email Service</h2>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              NATIVE RELAY
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Configure SMTP credentials to allow Super AI to autonomously compose and send emails via natural language commands.
          </p>
        </div>

        {/* Master Enabled Switch */}
        <div className="flex items-center gap-3 bg-[#1A1A22] border border-[#2E303D] px-4 py-2 rounded-xl">
          <span className="text-xs font-medium text-gray-300">
            {config.enabled ? 'Service Enabled' : 'Service Disabled'}
          </span>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              config.enabled ? 'bg-cyan-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preset Quick Select */}
      <div className="bg-[#15161E] border border-[#262833] rounded-xl p-4">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">
          Fast Provider Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                config.host === p.host
                  ? 'bg-cyan-950/50 border-cyan-500/70 text-cyan-300 shadow-sm'
                  : 'bg-[#1C1E29] border-[#2A2B37] text-gray-300 hover:border-gray-600 hover:text-white'
              }`}
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 truncate">{p.host}:{p.port}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-[#15161E] border border-[#262833] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#262833]">
          <Server className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Relay Server Settings</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-300 block mb-1">
              SMTP Host / Server Address
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="w-full bg-[#1C1E29] border border-[#2E303D] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1">
              Port
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 465 })}
              placeholder="465"
              className="w-full bg-[#1C1E29] border border-[#2E303D] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Security protocol selector */}
        <div className="flex items-center justify-between p-3 bg-[#1C1E29] border border-[#2A2B37] rounded-lg">
          <div>
            <div className="text-xs font-medium text-gray-200">Encryption / Security Protocol</div>
            <div className="text-[11px] text-gray-400">
              {config.secure
                ? 'Implicit TLS on connect (Standard for Port 465)'
                : 'STARTTLS upgrade negotiation (Standard for Port 587 or 25)'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfig({ ...config, secure: true, port: config.port === 587 ? 465 : config.port })}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                config.secure
                  ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                  : 'bg-transparent border-[#3A3D4D] text-gray-400 hover:text-white'
              }`}
            >
              SSL / TLS (465)
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, secure: false, port: config.port === 465 ? 587 : config.port })}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                !config.secure
                  ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-semibold'
                  : 'bg-transparent border-[#3A3D4D] text-gray-400 hover:text-white'
              }`}
            >
              STARTTLS (587)
            </button>
          </div>
        </div>

        {/* Authentication credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1">
              Username / Account Email
            </label>
            <input
              type="text"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
              placeholder="e.g. yourname@gmail.com"
              className="w-full bg-[#1C1E29] border border-[#2E303D] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-300">
                Password or App Password
              </label>
              {config.hasPass && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Password Configured
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={config.hasPass ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter 16-character App Password'}
                className="w-full bg-[#1C1E29] border border-[#2E303D] rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sender details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1">
              Sender Name
            </label>
            <input
              type="text"
              value={config.fromName}
              onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
              placeholder="Super AI Assistant"
              className="w-full bg-[#1C1E29] border border-[#2E303D] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1">
              From Email Address (Optional)
            </label>
            <input
              type="text"
              value={config.fromEmail}
              onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
              placeholder="Defaults to Account Email if empty"
              className="w-full bg-[#1C1E29] border border-[#2E303D] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Action buttons (Test Connection & Save) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#262833]">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="flex items-center gap-2 px-4 py-2 bg-[#222433] hover:bg-[#2B2D40] text-gray-200 border border-[#3A3D52] rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {testingConnection ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            )}
            {testingConnection ? 'Testing Connection...' : 'Test Connection'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-all shadow-sm shadow-cyan-900/30 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Save SMTP Settings
          </button>
        </div>

        {/* Feedback banners */}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>SMTP configuration updated and persisted to storage.</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                : 'bg-rose-950/50 border-rose-700/60 text-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">
                {testResult.success ? 'SMTP Connection Succeeded!' : 'Connection Verification Failed'}
              </div>
              <div className="mt-0.5 text-xs opacity-90">{testResult.message}</div>
            </div>
          </div>
        )}
      </div>

      {/* Gmail App Password Setup Tip */}
      <div className="bg-[#121623] border border-cyan-950 rounded-xl p-4 text-xs text-gray-300 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <Info className="w-4 h-4" />
          <span>Setting up Gmail or Google Workspace?</span>
        </div>
        <p className="text-gray-400 text-[11px] leading-relaxed">
          Google requires an <strong>App Password</strong> for third-party SMTP access instead of your personal password:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-gray-400 text-[11px] pl-1">
          <li>Enable 2-Step Verification on your Google Account.</li>
          <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">Google App Passwords <ExternalLink className="w-2.5 h-2.5" /></a></li>
          <li>Enter &quot;Super AI&quot; as App name and click <strong>Create</strong>.</li>
          <li>Copy the 16-character generated password (e.g. <code className="bg-black/40 px-1 py-0.5 rounded text-cyan-300">abcd efgh ijkl mnop</code>) into the Password field above.</li>
        </ol>
      </div>

      {/* Quick Test Email Dispatch */}
      <div className="bg-[#15161E] border border-[#262833] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#262833]">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Send Live Test Email</h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">End-to-End Relay Test</span>
        </div>

        <p className="text-xs text-gray-400">
          Enter your email to receive a live confirmation dispatch from Super AI.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="e.g. aquimohi@gmail.com"
            className="flex-1 bg-[#1C1E29] border border-[#2E303D] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={handleSendTestMail}
            disabled={sendingTestMail || !testRecipient}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          >
            {sendingTestMail ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {sendingTestMail ? 'Dispatching...' : 'Dispatch Live Email'}
          </button>
        </div>

        {sendMailResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              sendMailResult.success
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                : 'bg-rose-950/50 border-rose-700/60 text-rose-200'
            }`}
          >
            {sendMailResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{sendMailResult.message}</span>
          </div>
        )}
      </div>

      {/* Dispatched Emails Audit History */}
      <div className="bg-[#15161E] border border-[#262833] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#262833]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Dispatched Email Audit Log</h3>
            <span className="text-[10px] bg-[#222433] px-2 py-0.5 rounded text-gray-300 font-mono">
              {history.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              title="Refresh History"
              className="p-1.5 text-gray-400 hover:text-white rounded border border-[#2E303D] hover:bg-[#222433] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 border border-rose-900/60 hover:bg-rose-950/40 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            No outgoing emails sent yet. Use chat commands like{' '}
            <span className="text-cyan-400">&quot;aquimohi@gmail.com ko mail karo&quot;</span> or the live test dispatcher above.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-3 bg-[#1C1E29] border border-[#2A2B37] rounded-lg text-xs space-y-1 hover:border-[#383A4A] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        record.status === 'SENT'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {record.status}
                    </span>
                    <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                      {record.subject}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="truncate">To: {Array.isArray(record.to) ? record.to.join(', ') : record.to}</span>
                  {record.messageId && (
                    <span className="font-mono text-[9px] text-gray-500 truncate max-w-[120px]">
                      {record.messageId}
                    </span>
                  )}
                </div>

                {record.error && (
                  <div className="text-[10px] text-rose-400 bg-rose-950/30 p-1 rounded font-mono truncate">
                    {record.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

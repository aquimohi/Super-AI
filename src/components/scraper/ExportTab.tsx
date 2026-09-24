import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  Filter,
  Printer,
  FolderOpen,
  Save,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { SearchJob, LeadFilterParams } from '../../../server/services/scraper/types';
import { scraperApi, SavedExportFile } from '../../services/scraperApi';

export const ExportTab: React.FC = () => {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf' | 'json'>('csv');
  const [jobs, setJobs] = useState<SearchJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [onlyPhone, setOnlyPhone] = useState<boolean>(false);
  const [onlyWebsite, setOnlyWebsite] = useState<boolean>(false);
  const [onlyEmail, setOnlyEmail] = useState<boolean>(false);
  const [onlySocials, setOnlySocials] = useState<boolean>(false);

  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [successMsg, setSuccessMsg] = useState<{ title: string; detail?: string; directUrl?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [savedFiles, setSavedFiles] = useState<SavedExportFile[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [isOpeningFolder, setIsOpeningFolder] = useState<boolean>(false);

  const loadSavedFiles = useCallback(async () => {
    try {
      setIsLoadingSaved(true);
      const files = await scraperApi.getSavedExports();
      setSavedFiles(files);
    } catch (err) {
      console.warn('Failed to load saved exports:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    scraperApi
      .getJobs()
      .then((data) => setJobs(data))
      .catch((err) => console.error(err));

    loadSavedFiles();
  }, [loadSavedFiles]);

  useEffect(() => {
    const calcMatches = async () => {
      try {
        setIsCalculating(true);
        const params: LeadFilterParams = {
          jobId: selectedJobId || undefined,
          hasPhone: onlyPhone ? true : undefined,
          hasWebsite: onlyWebsite ? true : undefined,
          hasEmail: onlyEmail ? true : undefined,
          hasSocials: onlySocials ? true : undefined,
          pageSize: 1,
        };
        const res = await scraperApi.getLeads(params);
        setMatchingCount(res.total);
        setIsCalculating(false);
      } catch {
        setIsCalculating(false);
      }
    };
    calcMatches();
  }, [selectedJobId, onlyPhone, onlyWebsite, onlyEmail, onlySocials]);

  const getFilterParams = (): LeadFilterParams => ({
    jobId: selectedJobId || undefined,
    hasPhone: onlyPhone ? true : undefined,
    hasWebsite: onlyWebsite ? true : undefined,
    hasEmail: onlyEmail ? true : undefined,
    hasSocials: onlySocials ? true : undefined,
  });

  /**
   * Triggers an authentic browser HTTP attachment download via hidden iframe.
   * This guarantees that Edge & Chrome use the server's Content-Disposition header
   * and NEVER rename files to blob UUIDs or drop extensions.
   */
  const triggerBrowserDownload = (url: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 10000);
  };

  /**
   * Direct Download: Native HTTP stream directly from the server.
   */
  const handleDirectDownload = () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const params = getFilterParams();
      const downloadUrl = scraperApi.getExportUrl(params, format);
      const ext = format === 'excel' ? 'xls' : format;
      const fileName = `leads_export_${new Date().toISOString().slice(0, 10)}.${ext}`;

      triggerBrowserDownload(downloadUrl);

      setSuccessMsg({
        title: `Download started: ${fileName}`,
        detail: `File is downloading as an authentic .${ext.toUpperCase()} document. Also backed up on server disk in "exports/".`,
        directUrl: downloadUrl,
      });

      setTimeout(loadSavedFiles, 1500);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMsg(err.message || 'Failed to trigger download');
    }
  };

  /**
   * Save As... File Picker:
   * Calls window.showSaveFilePicker synchronously at the moment of click
   * to preserve user transient activation, then writes content directly.
   */
  const handleSaveAs = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const params = getFilterParams();
      const downloadUrl = scraperApi.getExportUrl(params, format);
      const dateStr = new Date().toISOString().slice(0, 10);
      const ext = format === 'excel' ? 'xls' : format;
      const suggestedName = `leads_export_${dateStr}.${ext}`;

      // Call showSaveFilePicker SYNCHRONOUSLY on the user click gesture
      if ('showSaveFilePicker' in window) {
        try {
          const typeConfigs: Record<string, { desc: string; mime: string; ext: string }> = {
            pdf: { desc: 'PDF Document (*.pdf)', mime: 'application/pdf', ext: '.pdf' },
            csv: { desc: 'CSV Spreadsheet (*.csv)', mime: 'text/csv', ext: '.csv' },
            excel: { desc: 'Excel Workbook (*.xls)', mime: 'application/vnd.ms-excel', ext: '.xls' },
            json: { desc: 'JSON Data Matrix (*.json)', mime: 'application/json', ext: '.json' },
          };
          const conf = typeConfigs[format] || typeConfigs.csv;

          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName,
            types: [
              {
                description: conf.desc,
                accept: { [conf.mime]: [conf.ext] },
              },
            ],
          });

          // Fetch stream after user selected destination file
          const res = await fetch(downloadUrl);
          const blob = await res.blob();
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(blob);
          await writableStream.close();

          setSuccessMsg({
            title: `File saved successfully!`,
            detail: `Saved as "${fileHandle.name}". Also backed up on server at: exports/${suggestedName}`,
            directUrl: downloadUrl,
          });
          loadSavedFiles();
          setIsProcessing(false);
          return;
        } catch (pickerErr: any) {
          // If user pressed cancel in the Windows file picker
          if (pickerErr.name === 'AbortError') {
            setIsProcessing(false);
            return;
          }
          console.warn('Native picker not completed, using direct HTTP download:', pickerErr);
        }
      }

      // Safe HTTP fallback (NEVER creates a blob URL)
      triggerBrowserDownload(downloadUrl);
      setSuccessMsg({
        title: `Download initiated: ${suggestedName}`,
        detail: `The file has been saved to your Downloads folder with .${ext} extension.`,
        directUrl: downloadUrl,
      });
      setTimeout(loadSavedFiles, 1500);
    } catch (err: any) {
      console.error('Save failed:', err);
      setErrorMsg(err.message || 'Failed to save export file');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Opens PDF in browser tab for direct inspection/printing
   */
  const handleOpenPdf = () => {
    const params = getFilterParams();
    const printUrl = scraperApi.getExportUrl(params, 'pdf', true);
    window.open(printUrl, '_blank');
  };

  /**
   * Opens the server's exports directory in Windows File Explorer
   */
  const handleOpenFolder = async () => {
    try {
      setIsOpeningFolder(true);
      await scraperApi.openExportFolder();
      setTimeout(() => setIsOpeningFolder(false), 2000);
    } catch (err) {
      setIsOpeningFolder(false);
      alert('Unable to open folder in host OS.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFormatIcon = (name: string) => {
    if (name.endsWith('.pdf')) return <FileText className="w-4 h-4 text-rose-400" />;
    if (name.endsWith('.xls')) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (name.endsWith('.csv')) return <FileText className="w-4 h-4 text-cyan-400" />;
    return <FileCode className="w-4 h-4 text-purple-400" />;
  };

  const currentExportUrl = scraperApi.getExportUrl(getFilterParams(), format);
  const currentFileName = `leads_export_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xls' : format}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-cyan-400" />
          <span>Export Data Center & Dossier Generator</span>
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Export verified leads into true CSV, Excel (.xls), PDF dossiers, or JSON with guaranteed file extensions.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex flex-col gap-1.5 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg.title}</span>
          </div>
          {successMsg.detail && (
            <p className="text-xs text-emerald-300/80 font-mono pl-6 break-all">
              {successMsg.detail}
            </p>
          )}
          {successMsg.directUrl && (
            <div className="pl-6 pt-1">
              <a
                href={successMsg.directUrl}
                download
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
              >
                <span>Click here if your browser didn't start the download</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 flex items-center gap-2.5 text-xs font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Format Selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-300">
          Select Output Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'csv',
              title: 'CSV File (.csv)',
              badge: 'UNIVERSAL / EXCEL',
              desc: 'Standard CSV with UTF-8 BOM. Opens directly in Microsoft Excel, Google Sheets, and CRMs.',
              icon: FileText,
              color: 'text-cyan-400',
              border: 'border-cyan-500/50 bg-cyan-950/30',
            },
            {
              id: 'excel',
              title: 'Excel Workbook (.xls)',
              badge: 'MICROSOFT EXCEL',
              desc: 'Native XML Spreadsheet with styled blue header rows, borders, and column formatting.',
              icon: FileSpreadsheet,
              color: 'text-emerald-400',
              border: 'border-emerald-500/50 bg-emerald-950/30',
            },
            {
              id: 'pdf',
              title: 'PDF Dossier (.pdf)',
              badge: 'PRINT READY',
              desc: 'Printable multi-page dossier with business cards, contacts, ratings & verified socials.',
              icon: FileText,
              color: 'text-rose-400',
              border: 'border-rose-500/50 bg-rose-950/30',
            },
            {
              id: 'json',
              title: 'JSON Data (.json)',
              badge: 'DEVELOPER API',
              desc: 'Full structured JSON objects with geolocation coordinates and enrichment audit logs.',
              icon: FileCode,
              color: 'text-purple-400',
              border: 'border-purple-500/50 bg-purple-950/30',
            },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = format === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setFormat(item.id as typeof format)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? `${item.border} shadow-[0_0_15px_rgba(0,240,255,0.2)]`
                    : 'bg-black/30 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${item.color}`} />
                    <span className="font-bold text-white text-sm">{item.title}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </div>
                <div className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 w-fit mb-2">
                  {item.badge}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-300">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>Apply Selective Export Filters</span>
        </div>

        {/* Filter by Job */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-400">Filter By Specific Job (Optional):</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="">All Jobs Combined (Entire Lead Database)</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.keyword} in {j.location} ({j.collectedResults} leads) • {new Date(j.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {/* Checkbox Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 text-xs font-mono text-slate-300">
            <input
              type="checkbox"
              checked={onlyPhone}
              onChange={(e) => setOnlyPhone(e.target.checked)}
              className="accent-cyan-400 rounded cursor-pointer"
            />
            <span>Include only leads with Phone</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 text-xs font-mono text-slate-300">
            <input
              type="checkbox"
              checked={onlyWebsite}
              onChange={(e) => setOnlyWebsite(e.target.checked)}
              className="accent-cyan-400 rounded cursor-pointer"
            />
            <span>Include only leads with Website</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 text-xs font-mono text-slate-300">
            <input
              type="checkbox"
              checked={onlyEmail}
              onChange={(e) => setOnlyEmail(e.target.checked)}
              className="accent-cyan-400 rounded cursor-pointer"
            />
            <span>Include only leads with Email</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 text-xs font-mono text-slate-300">
            <input
              type="checkbox"
              checked={onlySocials}
              onChange={(e) => setOnlySocials(e.target.checked)}
              className="accent-cyan-400 rounded cursor-pointer"
            />
            <span>Include only leads with Socials</span>
          </label>
        </div>

        {/* Counter & Action */}
        <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400">
            Matching exportable records:{' '}
            <span className="text-cyan-400 font-bold text-sm">
              {isCalculating ? '...' : matchingCount} leads
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View / Print in Browser (for PDF) */}
            {format === 'pdf' && (
              <button
                type="button"
                onClick={handleOpenPdf}
                disabled={matchingCount === 0}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Preview and print directly in browser"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>Open / Print</span>
              </button>
            )}

            {/* Direct Browser Anchor Link */}
            <a
              href={currentExportUrl}
              download={currentFileName}
              className={`px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/15 ${
                matchingCount === 0 ? 'opacity-40 pointer-events-none' : ''
              }`}
              title="Download directly via browser"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Direct Link</span>
            </a>

            {/* Save As (Choose Folder Picker) */}
            <button
              onClick={handleSaveAs}
              disabled={matchingCount === 0 || isProcessing}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Select folder on your computer using Windows Save dialog"
            >
              <Save className="w-4 h-4 text-cyan-400" />
              <span>Save As...</span>
            </button>

            {/* Primary Action Button: Direct Guaranteed Download */}
            <button
              onClick={handleDirectDownload}
              disabled={matchingCount === 0 || isProcessing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold text-xs tracking-wider uppercase font-mono transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              <Download className="w-4 h-4" />
              <span>Download {format.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Saved Exports in Project Folder */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">Project Exports & Disk Storage</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              {savedFiles.length} Saved Files
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSavedFiles}
              disabled={isLoadingSaved}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
              title="Refresh saved files list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSaved ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleOpenFolder}
              disabled={isOpeningFolder}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors border border-cyan-500/30"
              title="Open the exports directory in Windows File Explorer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isOpeningFolder ? 'Opening...' : 'Open Folder in Windows'}</span>
            </button>
          </div>
        </div>

        {savedFiles.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-slate-500">
            No exported files generated yet. Generate an export above to see it stored here on disk.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-60 overflow-y-auto pr-1">
            {savedFiles.slice(0, 10).map((file) => (
              <div
                key={file.name}
                className="py-2.5 flex items-center justify-between gap-4 text-xs font-mono hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {getFormatIcon(file.name)}
                  <div className="min-w-0">
                    <p className="text-slate-200 font-semibold truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatFileSize(file.sizeBytes)} • {new Date(file.lastModified).toLocaleDateString()} {new Date(file.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.name.endsWith('.pdf') && (
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] flex items-center gap-1 transition-colors border border-white/10"
                    >
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                      <span>View</span>
                    </a>
                  )}

                  <a
                    href={file.downloadUrl}
                    download={file.name}
                    className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] flex items-center gap-1 transition-colors border border-cyan-500/30"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

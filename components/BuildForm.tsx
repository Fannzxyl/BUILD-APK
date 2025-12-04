import React, { useState } from 'react';
import { Github, Play, Loader2, Download, CheckCircle2, AlertTriangle, Settings2, Image as ImageIcon, Smartphone, Monitor, Hash, Tag } from 'lucide-react';
import { BuildStatus } from '../types';

interface BuildFormProps {
  onBuild: (data: any) => void;
  status: BuildStatus;
  apkUrl?: string;
}

export const BuildForm: React.FC<BuildFormProps> = ({ onBuild, status, apkUrl }) => {
  const [url, setUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // State Settingan
  const [appName, setAppName] = useState('KataSensei');
  const [appId, setAppId] = useState('com.katasensei.app');
  const [orientation, setOrientation] = useState('portrait');
  const [fullscreen, setFullscreen] = useState(false);
  const [iconUrl, setIconUrl] = useState('');
  
  // State Versioning (BARU)
  const [versionCode, setVersionCode] = useState('1');
  const [versionName, setVersionName] = useState('1.0.0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onBuild({
        repoUrl: url,
        appName,
        appId,
        orientation,
        fullscreen,
        iconUrl,
        versionCode,
        versionName
      });
    }
  };

  const isLoading = status !== BuildStatus.IDLE && status !== BuildStatus.SUCCESS && status !== BuildStatus.ERROR;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <div className="bg-zinc-900/60 p-6 md:p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden ring-1 ring-white/5">
        
        {/* Background Gradient Mesh */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          {/* Repo URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300 ml-1">GitHub Repository URL</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Github className="h-5 w-5 text-zinc-500 group-focus-within:text-brand-400 transition-colors" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/username/project"
                className="block w-full pl-12 pr-4 py-4 bg-black/40 border border-zinc-700/50 rounded-2xl text-zinc-100 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder-zinc-600"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Toggle Settings */}
          <button 
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-brand-400 transition-colors bg-zinc-800/30 px-4 py-2 rounded-lg border border-zinc-800 hover:border-brand-500/30"
          >
            <Settings2 className="h-4 w-4" />
            {showSettings ? 'Hide Configuration' : 'Configure App (Name, Icon, Version)'}
          </button>

          {/* Settings Panel */}
          {showSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-black/20 rounded-2xl border border-zinc-800/50 animate-in slide-in-from-top-2">
                
                {/* App Name */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 ml-1">App Name</label>
                    <input type="text" value={appName} onChange={e => setAppName(e.target.value)} className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-500 outline-none transition-colors" />
                </div>

                {/* App ID */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 ml-1">Package ID</label>
                    <input type="text" value={appId} onChange={e => setAppId(e.target.value)} className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-zinc-400 focus:border-brand-500 outline-none transition-colors" />
                </div>

                {/* Version Code */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 ml-1 flex items-center gap-1"><Hash className="h-3 w-3"/> Version Code (Integer)</label>
                    <input type="number" value={versionCode} onChange={e => setVersionCode(e.target.value)} className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-500 outline-none transition-colors" />
                </div>

                {/* Version Name */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 ml-1 flex items-center gap-1"><Tag className="h-3 w-3"/> Version Name (String)</label>
                    <input type="text" value={versionName} onChange={e => setVersionName(e.target.value)} className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-500 outline-none transition-colors" />
                </div>

                {/* Orientation */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 ml-1">Orientation</label>
                    <div className="relative">
                        <Smartphone className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                        <select value={orientation} onChange={e => setOrientation(e.target.value)} className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-brand-500 outline-none appearance-none cursor-pointer">
                            <option value="portrait">Portrait (Vertical)</option>
                            <option value="landscape">Landscape (Horizontal)</option>
                            <option value="user">Auto (Device Settings)</option>
                        </select>
                    </div>
                </div>

                {/* Fullscreen Toggle */}
                <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2">
                    <div className="flex flex-col">
                        <label className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5" /> Immersive Mode
                        </label>
                        <span className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                            {fullscreen ? 'ON: Hides Status Bar (Game)' : 'OFF: Shows Status Bar (Standard)'}
                        </span>
                    </div>
                    <input type="checkbox" checked={fullscreen} onChange={e => setFullscreen(e.target.checked)} className="accent-brand-500 h-5 w-5 cursor-pointer" />
                </div>

                {/* Icon URL */}
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 ml-1 flex items-center gap-1"><ImageIcon className="h-3 w-3"/> Icon URL (Direct Link)</label>
                    <input type="url" value={iconUrl} onChange={e => setIconUrl(e.target.value)} placeholder="https://i.postimg.cc/..." className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-500 outline-none transition-colors" />
                </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
            <div className="flex items-start gap-2 text-xs text-amber-500/90 bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20 max-w-sm w-full md:w-auto">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Build takes ~3-5 mins. Do not close tab.</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !url}
              className={`w-full md:w-auto flex items-center justify-center px-8 py-4 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]
                ${isLoading || !url 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-500/25'}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Building Project...
                </>
              ) : (
                <>
                  <Play className="-ml-1 mr-2 h-4 w-4 fill-current" />
                  Generate APK
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Card */}
      {status === BuildStatus.SUCCESS && apkUrl && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-4 shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-500/20 rounded-full ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-emerald-400">Build Complete!</h3>
              <p className="text-sm text-emerald-200/60 mt-1">Your Android package is ready to install.</p>
            </div>
          </div>
          <a 
            href={apkUrl} 
            download 
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/40 hover:-translate-y-1"
          >
            <Download className="h-5 w-5" />
            DOWNLOAD APK
          </a>
        </div>
      )}
    </div>
  );
};
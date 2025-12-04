import React, { useState } from 'react';
import { Github, Play, Loader2, Download, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { BuildStatus } from '../types';

interface BuildFormProps {
  onBuild: (url: string) => void;
  status: BuildStatus;
  apkUrl?: string;
}

export const BuildForm: React.FC<BuildFormProps> = ({ onBuild, status, apkUrl }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onBuild(url);
    }
  };

  const isLoading = status !== BuildStatus.IDLE && status !== BuildStatus.SUCCESS && status !== BuildStatus.ERROR;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div className="bg-zinc-900/80 p-8 rounded-2xl border border-zinc-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/10 to-indigo-500/10 rounded-2xl blur-lg group-hover:opacity-100 transition duration-1000 opacity-50"></div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300 ml-1">
              GitHub Repository URL
            </label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Github className="h-5 w-5 text-zinc-500 group-focus-within/input:text-brand-400 transition-colors" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/username/your-web-project"
                className="block w-full pl-12 pr-4 py-4 bg-zinc-950/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all shadow-inner"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
            
            {/* Warning Text */}
            <div className="flex items-start gap-2 text-xs text-amber-500/80 bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-500/10 max-w-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>First build can take up to 5 minutes. Do not close this tab.</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !url}
              className={`w-full md:w-auto flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg transform active:scale-95
                ${isLoading || !url 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 hover:shadow-brand-500/40 shadow-brand-900/20'
                }`}
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

      {status === BuildStatus.SUCCESS && apkUrl && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-4 duration-700 shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-500/20 rounded-full ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-emerald-400">Build Complete!</h3>
              <p className="text-sm text-emerald-200/60 mt-1">Your Android package is ready.</p>
            </div>
          </div>
          <a
            href={apkUrl}
            download
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 transform hover:-translate-y-1 hover:shadow-emerald-500/40"
          >
            <Download className="h-5 w-5" />
            DOWNLOAD APK
          </a>
        </div>
      )}

      {status === BuildStatus.ERROR && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-6 flex items-start gap-4 animate-in slide-in-from-bottom-2">
          <AlertCircle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-400 font-semibold mb-1">Build Failed</h4>
            <p className="text-sm text-red-200/70">The build process encountered an error. Please check the logs below for details.</p>
          </div>
        </div>
      )}
    </div>
  );
};
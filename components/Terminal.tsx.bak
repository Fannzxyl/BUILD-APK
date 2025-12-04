import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
  status: string;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, status }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-emerald-400 font-bold';
      case 'command': return 'text-blue-400 font-semibold';
      default: return 'text-zinc-300';
    }
  };

  return (
    <div className="w-full bg-zinc-900 rounded-lg border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Terminal Header */}
      <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-zinc-400" />
          <span className="text-sm font-mono text-zinc-400">build_server@appbuilder:~/workspace</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm space-y-1 terminal-scroll bg-black/40"
      >
        {logs.length === 0 && (
          <div className="text-zinc-600 italic">Waiting for input...</div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3">
            <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
            <span className={`break-all ${getLogColor(log.type)}`}>
              {log.type === 'command' && '$ '}
              {log.message}
            </span>
          </div>
        ))}
        
        {status !== 'IDLE' && status !== 'SUCCESS' && status !== 'ERROR' && (
          <div className="flex items-center gap-2 text-zinc-400 mt-2 animate-pulse">
            <span className="w-2 h-4 bg-zinc-400 block"></span>
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};
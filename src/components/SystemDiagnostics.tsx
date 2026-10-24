import React, { useState } from 'react';
import {
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  Radio,
  Server,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { PlayoutStatus } from '../types';

interface SystemDiagnosticsProps {
  status: PlayoutStatus;
  onSendTelnetCommand: (cmd: string) => Promise<string>;
}

export const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({
  status,
  onSendTelnetCommand
}) => {
  const [customCommand, setCustomCommand] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastOutput, setLastOutput] = useState<string | null>(null);

  // Commandes vérifiées sur Liquidsoap 2.2 (serveur Kambove)
  const quickCommands = [
    { label: 'output_url.remaining', desc: 'Secondes restantes du clip à l\'antenne' },
    { label: 'request.on_air', desc: 'Numéro du clip à l\'antenne' },
    { label: 'var.get antenne', desc: 'Antenne active (true) ou coupée (false)' },
    { label: 'tv_playlist.reload', desc: 'Recharger active_playlist.txt' },
    { label: 'version', desc: 'Version de Liquidsoap installée' },
    { label: 'help', desc: 'Liste des commandes disponibles' }
  ];

  const handleExecute = async (cmdToRun?: string) => {
    const command = cmdToRun || customCommand;
    if (!command.trim()) return;

    setIsExecuting(true);
    try {
      const response = await onSendTelnetCommand(command.trim());
      setLastOutput(response);
      if (!cmdToRun) setCustomCommand('');
    } catch (err: any) {
      setLastOutput(`Erreur : ${err.message || 'Impossible de joindre le socket telnet'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Vitals Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Liquidsoap Playout Daemon */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Daemon Liquidsoap
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${status.serverStatus.liquidsoapRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {status.serverStatus.liquidsoapPid ? `PID ${status.serverStatus.liquidsoapPid}` : 'Non détecté'}
          </div>
          <p className={`text-xs mt-1 flex items-center gap-1 font-mono ${status.serverStatus.liquidsoapRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status.serverStatus.liquidsoapRunning ? 'Processus actif • Port 1234' : 'En attente de démarrage Ubuntu'}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            Service : kambove-regie.service
          </div>
        </div>

        {/* Telnet Socket Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Socket Telnet IPC
            </span>
            <Terminal className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            127.0.0.1:{status.serverStatus.telnetPort}
          </div>
          <p className={`text-xs mt-1 font-mono ${status.serverStatus.telnetConnected ? 'text-indigo-300' : 'text-slate-400'}`}>
            {status.serverStatus.telnetConnected ? 'Connecté (IPC actif)' : 'Socket en attente'}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            Commandes synchrones actives
          </div>
        </div>

        {/* RTMP Playout Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sortie RTMP (Owncast)
            </span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {status.rtmpStatus.bitrateKbps} <span className="text-sm font-normal text-slate-400">kbps</span>
          </div>
          <p className={`text-xs mt-1 font-mono ${status.rtmpStatus.connected ? 'text-amber-300' : 'text-slate-400'}`}>
            {status.rtmpStatus.connected ? '720p @ 25 FPS • 0 frames perdues' : 'Flux en pause / Standby'}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono truncate">
            {status.rtmpStatus.url}
          </div>
        </div>

        {/* NAS NFS / CIFS Mount */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stockage NAS Mount
            </span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {status.nasStatus.mounted ? `${status.nasStatus.freeSpaceGB} Go libres` : 'Non monté'}
          </div>
          <p className={`text-xs mt-1 font-mono ${status.nasStatus.mounted ? 'text-emerald-400' : 'text-rose-400'}`}>
            {status.nasStatus.mounted ? `Monté • Latence : ${status.nasStatus.latencyMs} ms` : 'Point de montage absent'}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono truncate">
            {status.nasStatus.mountPoint}
          </div>
        </div>
      </div>

      {/* Interactive Telnet Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Console de Commande Telnet Liquidsoap (Port 1234)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Liaison directe IPC
            </span>
          </div>

          {/* Quick Command Buttons */}
          <div className="mb-4">
            <span className="text-[11px] text-slate-400 font-semibold block mb-2">
              Commandes rapides courantes :
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {quickCommands.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleExecute(q.label)}
                  disabled={isExecuting}
                  className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
                >
                  <div className="font-mono text-xs font-bold text-indigo-300 truncate">
                    {q.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {q.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Commande telnet (ex : request.on_air)"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExecute();
              }}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleExecute()}
              disabled={isExecuting}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Envoyer</span>
            </button>
          </div>

          {/* Output Display */}
          {lastOutput && (
            <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
              <span className="text-slate-500 block text-[10px] uppercase mb-1">Dernière réponse du serveur :</span>
              {lastOutput}
            </div>
          )}
        </div>

        {/* Historical Telnet Logs */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Journal d’événements en direct :
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            {status.telnetLog.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-slate-300">
                <span className="text-slate-600 text-[10px]">{log.time}</span>
                <span className="text-indigo-400 font-semibold">{log.command} &rarr;</span>
                <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'}>
                  {log.response}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Tv,
  Radio,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  FastForward,
  RotateCw,
  Cpu,
  Activity,
  Layers,
  Clock,
  Power
} from 'lucide-react';
import { PlayoutStatus } from '../types';

interface HeaderProps {
  status: PlayoutStatus;
  activeTab: 'regie' | 'nas' | 'diagnostics';
  onTabChange: (tab: 'regie' | 'nas' | 'diagnostics') => void;
  onControl: (action: string) => void;
  isActionLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  activeTab,
  onTabChange,
  onControl,
  isActionLoading
}) => {
  const getBadgeStyle = () => {
    switch (status.status) {
      case 'ONLINE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'STANDBY':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'OBS_LIVE':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    }
  };

  const getStatusLabel = () => {
    switch (status.status) {
      case 'ONLINE':
        return 'ANTENNE ACTIVE (ON-AIR)';
      case 'STANDBY':
        return 'STANDBY / VEILLE';
      case 'OBS_LIVE':
        return 'DIRECT OBS (CULTE)';
      default:
        return status.mode === 'off' ? 'ANTENNE COUPÉE' : 'HORS LIGNE';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      {/* Top Banner: Brand, Channel Info & Master Automation Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Station Identity */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
                <Tv className="w-5 h-5 text-white" />
              </div>
              <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                status.onAir ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>KAMBOVE TV</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                    MASTER CONTROL
                  </span>
                </h1>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle()}`}>
                  {getStatusLabel()}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Régie de diffusion automatique H24</span>
                <span className="text-slate-600">&bull;</span>
                <span className="font-mono text-slate-400">192.168.100.74</span>
              </p>
            </div>
          </div>

          {/* Master Playout Actions Bar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Lancer On-Air */}
            <button
              id="btn-ctrl-start"
              onClick={() => onControl('start')}
              disabled={isActionLoading || status.onAir}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                status.onAir
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Lancer On-Air</span>
            </button>

            {/* Standby */}
            <button
              id="btn-ctrl-standby"
              onClick={() => onControl('standby')}
              disabled={isActionLoading || !status.onAir}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                !status.onAir
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
              }`}
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Standby</span>
            </button>

            {/* Couper l'antenne : plus rien n'est envoyé à Owncast */}
            <button
              id="btn-ctrl-off"
              onClick={() => {
                if (window.confirm("Couper complètement l'antenne ? Plus rien ne sera envoyé à Owncast.")) {
                  onControl('off');
                }
              }}
              disabled={isActionLoading || status.mode === 'off'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                status.mode === 'off'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-red-700 hover:bg-red-600 text-white shadow-red-900/30'
              }`}
              title="Arrêter complètement la diffusion vers Owncast"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Couper l'antenne</span>
            </button>

            {/* Suivant / Skip */}
            <button
              id="btn-ctrl-skip"
              onClick={() => onControl('skip')}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Passer immédiatement au média suivant"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Média Suivant</span>
            </button>

            {/* Direct OBS */}
            <button
              id="btn-ctrl-obs"
              onClick={() => onControl('obs_mode')}
              disabled={isActionLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                status.mode === 'obs'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400'
                  : 'bg-slate-800 hover:bg-purple-950/70 text-purple-300 border border-purple-800/60'
              }`}
              title="Basculer la diffusion sur le flux direct OBS (Culte)"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Direct OBS</span>
            </button>

            {/* Mire Urgence */}
            <button
              id="btn-ctrl-mire"
              onClick={() => onControl('emergency_mire')}
              disabled={isActionLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                status.mode === 'emergency_mire'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                  : 'bg-slate-800 hover:bg-rose-950/60 text-rose-300 border border-rose-900/60'
              }`}
              title="Activer la mire de secours technique"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Mire</span>
            </button>

            {/* Recharger playlist */}
            <button
              id="btn-ctrl-reload"
              onClick={() => onControl('reload')}
              disabled={isActionLoading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Recharger Liquidsoap sans couper l'antenne"
            >
              <RotateCw className={`w-4 h-4 ${isActionLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Bar & Key Stats */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 py-2">
          
          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            <button
              id="tab-regie"
              onClick={() => onTabChange('regie')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                activeTab === 'regie'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Régie & Grille de Diffusion</span>
            </button>

            <button
              id="tab-nas"
              onClick={() => onTabChange('nas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                activeTab === 'nas'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Médiathèque NAS (/mnt)</span>
            </button>

            <button
              id="tab-diagnostics"
              onClick={() => onTabChange('diagnostics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                activeTab === 'diagnostics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Diagnostics Ubuntu & Telnet</span>
            </button>
          </nav>

          {/* Quick Telemetry Vitals */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">Owncast RTMP</span>
              <span className="text-slate-500">:1935</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span className="text-slate-300">Liquidsoap Telnet</span>
              <span className="text-slate-500">:1234</span>
            </div>

            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 text-slate-400" />
              <span className="text-slate-300">NAS</span>
              <span className="text-emerald-400 font-bold">Connecté</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

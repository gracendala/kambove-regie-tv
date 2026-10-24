import React from 'react';
import {
  Tv,
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

  const ctrlBase =
    'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-h-[52px] sm:min-h-0 px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition shadow-sm';
  const ctrlOff = 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700';

  const tabs: Array<{ id: 'regie' | 'nas' | 'diagnostics'; label: string; short: string; Icon: typeof Layers }> = [
    { id: 'regie', label: 'Régie & Grille de Diffusion', short: 'Régie', Icon: Layers },
    { id: 'nas', label: 'Médiathèque NAS', short: 'Médiathèque', Icon: HardDrive },
    { id: 'diagnostics', label: 'Diagnostics & Telnet', short: 'Diagnostics', Icon: Activity }
  ];

  const dot = (ok: boolean) => `w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-rose-500'}`;

  return (
    <>
    <header className="bg-slate-900 border-b border-slate-800 md:sticky md:top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

          {/* Identité de la chaîne + état */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
                <Tv className="w-5 h-5 text-white" />
              </div>
              <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                status.onAir ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
              }`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>KAMBOVE TV</span>
                  <span className="hidden sm:inline text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                    MASTER CONTROL
                  </span>
                </h1>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getBadgeStyle()}`}>
                  {getStatusLabel()}
                </span>
              </div>
              <p className="hidden sm:flex text-xs text-slate-400 items-center gap-1.5">
                <span>Régie de diffusion automatique H24</span>
                <span className="text-slate-600">&bull;</span>
                <span className="font-mono text-slate-400">{status.serverStatus?.hostname}</span>
              </p>
            </div>
          </div>

          {/* Commandes d'antenne : grille de gros boutons sur téléphone */}
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:items-center gap-2">
            <button
              id="btn-ctrl-start"
              onClick={() => onControl('start')}
              disabled={isActionLoading || status.onAir}
              className={`${ctrlBase} ${status.onAir ? ctrlOff : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'}`}
            >
              <Play className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-current" />
              <span><span className="sm:hidden">On-Air</span><span className="hidden sm:inline">Lancer On-Air</span></span>
            </button>

            <button
              id="btn-ctrl-standby"
              onClick={() => onControl('standby')}
              disabled={isActionLoading || !status.onAir}
              className={`${ctrlBase} ${!status.onAir ? ctrlOff : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'}`}
            >
              <Square className="w-3.5 h-3.5 sm:w-3 sm:h-3 fill-current" />
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
              className={`${ctrlBase} ${status.mode === 'off' ? ctrlOff : 'bg-red-700 hover:bg-red-600 text-white shadow-red-900/30'}`}
              title="Arrêter complètement la diffusion vers Owncast"
            >
              <Power className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span><span className="sm:hidden">Couper</span><span className="hidden sm:inline">Couper l'antenne</span></span>
            </button>

            <button
              id="btn-ctrl-skip"
              onClick={() => onControl('skip')}
              disabled={isActionLoading}
              className={`${ctrlBase} font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700`}
              title="Passer immédiatement au média suivant"
            >
              <FastForward className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span><span className="sm:hidden">Suivant</span><span className="hidden sm:inline">Média Suivant</span></span>
            </button>

            <button
              id="btn-ctrl-mire"
              onClick={() => onControl('emergency_mire')}
              disabled={isActionLoading}
              className={`${ctrlBase} font-semibold ${
                status.mode === 'emergency_mire'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                  : 'bg-slate-800 hover:bg-rose-950/60 text-rose-300 border border-rose-900/60'
              }`}
              title="Écran d'attente"
            >
              <AlertTriangle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Mire</span>
            </button>

            <button
              id="btn-ctrl-reload"
              onClick={() => onControl('reload')}
              disabled={isActionLoading}
              className={`${ctrlBase} font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700`}
              title="Recharger la playlist dans Liquidsoap sans couper l'antenne"
            >
              <RotateCw className={`w-4 h-4 ${isActionLoading ? 'animate-spin' : ''}`} />
              <span className="sm:hidden">Recharger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Onglets (ordinateur) + voyants réels */}
      <div className="hidden md:block bg-slate-950/60 border-t border-slate-800/80 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 py-2">
          <nav className="flex items-center space-x-1">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                id={`tab-${id}`}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                  activeTab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className={dot(!!status.rtmpStatus?.connected)}></span>
              <span className="text-slate-300">Owncast</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={dot(!!status.serverStatus?.telnetConnected)}></span>
              <span className="text-slate-300">Liquidsoap</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={dot(!!status.nasStatus?.mounted)}></span>
              <span className="text-slate-300">NAS</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Barre d'onglets en bas de l'écran (téléphone) */}
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-800 grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ id, short, Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${
            activeTab === id ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span>{short}</span>
        </button>
      ))}
    </nav>
    </>
  );
};

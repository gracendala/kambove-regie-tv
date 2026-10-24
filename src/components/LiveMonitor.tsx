import React, { useEffect, useState } from 'react';
import {
  Play,
  SkipForward,
  Radio,
  Volume2,
  Clock,
  ArrowRight,
  Tv,
  Film,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { PlayoutStatus } from '../types';

interface LiveMonitorProps {
  status: PlayoutStatus;
  onControl: (action: string) => void;
  onQuickInsert: (type: 'mire') => void;
  isActionLoading: boolean;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  status,
  onControl,
  onQuickInsert,
  isActionLoading
}) => {
  const current = status.currentMedia;
  const next = status.nextMedia;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* PGM / On-Air Monitor (8 cols) */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
        {/* Monitor Header */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${status.onAir ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`}></span>
              {status.onAir ? 'PGM • EN DIRECT' : 'PGM • VEILLE'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              720p HD @ 25fps
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              ID Liquidsoap : <span className="text-slate-200">tv_playlist</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {status.mode === 'obs' ? 'FLUX OBS' : status.mode === 'emergency_mire' ? 'MIRE SECOURS' : 'PLAYLIST NAS'}
            </span>
          </div>
        </div>

        {/* Video Simulation Canvas / Frame */}
        <div className="relative bg-black h-52 sm:h-64 flex flex-col justify-between p-4 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none z-10" />

          {/* Background simulated graphic */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 select-none">
            {status.mode === 'emergency_mire' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-r from-red-900 via-amber-900 to-blue-900">
                <span className="font-mono text-lg font-bold tracking-widest text-white">
                  MIRE TECHNIQUE - KAMBOVE TV
                </span>
                <span className="text-xs text-amber-200 mt-1">Écran de secours actif</span>
              </div>
            ) : status.mode === 'obs' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                <Radio className="w-14 h-14 text-amber-500/70 mb-2" />
                <span className="font-mono text-base font-bold text-amber-400">DIRECT OBS STUDIO EN COURS</span>
                <span className="text-xs text-slate-400">Entrée RTMP active</span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/60 to-slate-950">
                <Film className="w-14 h-14 text-indigo-500/30 mb-2" />
                <span className="text-xs font-semibold tracking-wider text-slate-500">KAMBOVE PLAYOUT SYSTEM</span>
              </div>
            )}
          </div>

          {/* Top overlay inside monitor */}
          <div className="relative z-20 flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider text-white shadow ${status.onAir ? 'bg-rose-600' : 'bg-slate-700'}`}>
                {status.onAir ? 'DIRECT' : 'HORS ANTENNE'}
              </span>
              {current?.category && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700 uppercase">
                  {current.category}
                </span>
              )}
            </div>

            {/* Audio Indicator (CSS-driven, 0 CPU JavaScript overhead) */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-3 rounded-xs ${status.onAir ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                <span className={`w-1.5 h-4 rounded-xs ${status.onAir ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                <span className={`w-1.5 h-2.5 rounded-xs ${status.onAir ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                <span className={`w-1.5 h-3.5 rounded-xs ${status.onAir ? 'bg-emerald-400' : 'bg-slate-700'}`} />
              </div>
            </div>
          </div>

          {/* Bottom overlay: Media Title & Time Information */}
          <div className="relative z-20">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide truncate drop-shadow">
              {current ? current.title : 'Aucun média actif en cours de lecture'}
            </h2>
            <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
              {current?.path || '/home/grace/regie-tv/attente.mp4'}
            </p>
          </div>
        </div>

        {/* Playhead Progress & Scrub Bar */}
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{current?.elapsedFormatted || '00:00'}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{current?.durationFormatted || '00:00'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Reste :</span>
              <span className="text-rose-400 font-bold">{current?.remainingFormatted || '00:00'}</span>
              <span className="text-slate-500 text-[10px]">({current?.progress || 0}%)</span>
            </div>
          </div>

          {/* Progress track */}
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60 shadow-inner">
            <div
              className="h-full bg-indigo-500 transition-all duration-300 ease-linear rounded-full"
              style={{ width: `${current?.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Quick Transition Actions */}
        <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Actions rapides :</span>
          <div className="flex items-center gap-2">
            <button
              id="btn-quick-mire"
              onClick={() => onQuickInsert('mire')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-xs"
            >
              + Écran d'attente
            </button>
            <button
              id="btn-quick-skip"
              onClick={() => onControl('skip')}
              disabled={isActionLoading}
              className="px-2.5 py-1 rounded bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/40 transition flex items-center gap-1 text-xs"
            >
              <SkipForward className="w-3 h-3" />
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* PVW / Next Cue Card (4 cols) */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              PVW • PROCHAIN ENCHAÎNEMENT
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              À SUIVRE
            </span>
          </div>

          {next ? (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Titre du média
                </span>
                <h3 className="text-sm font-bold text-white line-clamp-2 mt-0.5">
                  {next.title}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 block">DÉBUT</span>
                  <span className="text-emerald-400 font-bold">{next.startTime || 'Enchaîné'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">DURÉE</span>
                  <span className="text-slate-200">{next.durationFormatted}</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 break-all bg-slate-950/40 p-2 rounded border border-slate-800/60">
                <span className="text-slate-500 block text-[9px] uppercase">Chemin NAS</span>
                {next.path}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              Aucun média en attente dans la grille active.
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Enchaînement :</span>
          <span className="font-medium text-emerald-400 font-mono text-xs">Fondu auto (Liquidsoap)</span>
        </div>
      </div>
    </div>
  );
};

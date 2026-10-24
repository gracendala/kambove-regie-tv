import React, { useState, useEffect } from 'react';
import { Upload, Play,
  Trash2,
  MoveUp,
  MoveDown,
  Clock,
  Save,
  Plus,
  Copy,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  FileDown,
  Sparkles,
  Lock,
  Unlock,
  Radio } from 'lucide-react';
import { PlaylistItem, RundownTemplate } from '../types';
import { cascadeRundownTimes, formatDuration, timeStringToSeconds } from '../utils/timeFormat';
import { SCHEDULE_TEMPLATES } from '../data/templates';

interface ScheduleGridProps {
  playlist: PlaylistItem[];
  currentIndex: number;
  onUpdatePlaylist: (newPlaylist: PlaylistItem[]) => void;
  onSavePlaylist: () => void;
  onOpenNasExplorer: () => void;
  isSaving: boolean;
  saveMessage: string | null;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  playlist,
  currentIndex,
  onUpdatePlaylist,
  onSavePlaylist,
  onOpenNasExplorer,
  isSaving,
  saveMessage
}) => {
  // Fait défiler la grille jusqu'au clip en cours quand il change
  useEffect(() => {
    if (currentIndex < 0) return;
    document.getElementById(`grille-ligne-${currentIndex}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RundownTemplate | null>(null);

  // Total duration
  const totalSeconds = playlist.reduce((acc, item) => acc + (item.duration || 0), 0);
  const totalFormatted = formatDuration(totalSeconds);

  // Move item up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...playlist];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onUpdatePlaylist(cascadeRundownTimes(updated));
  };

  // Move item down
  const handleMoveDown = (index: number) => {
    if (index === playlist.length - 1) return;
    const updated = [...playlist];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onUpdatePlaylist(cascadeRundownTimes(updated));
  };

  // Delete item
  const handleDelete = (index: number) => {
    const updated = playlist.filter((_, i) => i !== index);
    onUpdatePlaylist(cascadeRundownTimes(updated));
  };

  // Duplicate item
  const handleDuplicate = (index: number) => {
    const item = playlist[index];
    const duplicated: PlaylistItem = {
      ...item,
      id: `pl-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      status: 'pending'
    };
    const updated = [...playlist.slice(0, index + 1), duplicated, ...playlist.slice(index + 1)];
    onUpdatePlaylist(cascadeRundownTimes(updated));
  };

  // Toggle Fixed Time
  const handleToggleFixed = (index: number) => {
    const updated = [...playlist];
    updated[index] = {
      ...updated[index],
      isFixedTime: !updated[index].isFixedTime
    };
    onUpdatePlaylist(cascadeRundownTimes(updated));
  };

  // Change Time Input
  const handleTimeChange = (index: number, newTime: string) => {
    const updated = [...playlist];
    updated[index] = {
      ...updated[index],
      scheduledTime: newTime,
      calculatedStartTime: newTime,
      isFixedTime: true
    };
    onUpdatePlaylist(cascadeRundownTimes(updated));
  };

  // Load template
  const handleLoadTemplate = (tpl: RundownTemplate) => {
    const newItems: PlaylistItem[] = tpl.items.map((item, idx) => ({
      ...item,
      id: `pl-tpl-${Date.now()}-${idx}`
    }));
    onUpdatePlaylist(cascadeRundownTimes(newItems));
    setShowTemplatesModal(false);
  };

  // Clear playlist
  const handleClear = () => {
    if (confirm('Voulez-vous vraiment vider toute la programmation actuelle ?')) {
      onUpdatePlaylist([]);
    }
  };

  // Export as active_playlist.txt text format
  const handleExportTxt = () => {
    const content = playlist
      .map((item) => `${item.calculatedStartTime || item.scheduledTime || '00:00'}|${item.path}`)
      .join('\n') + '\n';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'active_playlist.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Table Header Bar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>Grille de Programmation Quotidienne</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {playlist.length} éléments &bull; Durée totale : {totalFormatted}
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronisé avec <code className="text-indigo-400 font-mono">/home/grace/regie-tv/playlists/active_playlist.txt</code>
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <label
            id="btn-import-playlist-file"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Importer une playlist sauvegardée (.txt ou .json)"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importer Playlist</span>
            <input
              type="file"
              accept=".txt,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const content = event.target?.result as string;
                    if (file.name.endsWith('.json')) {
                      const loaded = JSON.parse(content);
                      if (Array.isArray(loaded)) onUpdatePlaylist(loaded);
                    } else {
                      // Fichier texte de chemins vidéo
                      const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
                      const items = lines.map((p, idx) => {
                        const name = p.split('/').pop() || p;
                        return {
                          id: 'imported-' + idx + '-' + Date.now(),
                          title: name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '),
                          path: p,
                          category: 'Général',
                          duration: 1800,
                          durationFormatted: '30:00',
                          scheduledTime: '08:00:00',
                          calculatedStartTime: '08:00:00',
                          calculatedEndTime: '08:30:00'
                        };
                      });
                      onUpdatePlaylist(items);
                    }
                  } catch (err) {
                    alert('Erreur lors de la lecture du fichier playlist');
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>

          <button
            id="btn-open-templates"
            onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Modèles de Grille</span>
          </button>

          <button
            id="btn-add-nas-media"
            onClick={onOpenNasExplorer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter Médias (NAS)</span>
          </button>

          <button
            id="btn-save-playlist"
            onClick={onSavePlaylist}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer la Grille TV'}</span>
          </button>

          <button
            id="btn-export-txt"
            onClick={handleExportTxt}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Télécharger le fichier active_playlist.txt"
          >
            <FileDown className="w-4 h-4" />
          </button>

          <button
            id="btn-clear-grid"
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 transition"
            title="Vider la grille"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Save feedback banner if any */}
      {saveMessage && (
        <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80">Liquidsoap reloaded</span>
        </div>
      )}

      {/* Schedule Table */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              <th className="py-2.5 px-3 w-12 text-center">#</th>
              <th className="py-2.5 px-3 w-32">HORAIRE DÉBUT</th>
              <th className="py-2.5 px-3">MÉDIA / TITRE DU PROGRAMME</th>
              <th className="py-2.5 px-3 w-28">CATÉGORIE</th>
              <th className="py-2.5 px-3 w-24">DURÉE</th>
              <th className="py-2.5 px-3 w-28">FIN ESTIMÉE</th>
              <th className="py-2.5 px-3 w-36 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {playlist.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clock className="w-8 h-8 text-slate-600 stroke-1" />
                    <span className="text-sm font-medium">La grille de programmation est vide.</span>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Cliquez sur <b>Ajouter Médias (NAS)</b> pour sélectionner des fichiers vidéo ou chargez un <b>Modèle de Grille</b> prédéfini.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              playlist.map((item, index) => {
                const isPlaying = index === currentIndex;

                return (
                  <tr
                    key={item.id}
                    id={`grille-ligne-${index}`}
                    className={`transition group ${
                      isPlaying
                        ? 'bg-rose-950/20 border-l-4 border-l-rose-500 hover:bg-rose-950/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Index & Playing Indicator */}
                    <td className="py-3 px-3 text-center font-mono">
                      {isPlaying ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse" title="En cours de diffusion">
                          ON
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">{index + 1}</span>
                      )}
                    </td>

                    {/* Start Time Input */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          step="1"
                          value={item.calculatedStartTime || item.scheduledTime || '08:00:00'}
                          onChange={(e) => handleTimeChange(index, e.target.value)}
                          className="bg-slate-950 text-emerald-400 font-mono font-semibold px-2 py-1 rounded border border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleToggleFixed(index)}
                          title={item.isFixedTime ? 'Heure fixe verrouillée' : 'Heure enchaînée automatique'}
                          className="text-slate-500 hover:text-slate-300 transition"
                        >
                          {item.isFixedTime ? (
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Media Title & Path */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className={`font-semibold ${isPlaying ? 'text-rose-200' : 'text-slate-200'} truncate max-w-md`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-md mt-0.5">
                          {item.path}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700/80">
                        {item.category || item.type}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 font-mono text-slate-300 font-medium">
                      {item.durationFormatted}
                    </td>

                    {/* Calculated End Time */}
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {item.calculatedEndTime}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Monter"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === playlist.length - 1}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Descendre"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(index)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-indigo-300"
                          title="Dupliquer l'élément"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(index)}
                          className="p-1 rounded hover:bg-red-900/50 text-slate-400 hover:text-red-400"
                          title="Supprimer de la grille"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Instructions / Quick Tip */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Calcul automatique des enchaînements activé (zéro trou d'antenne).</span>
        </div>
        <span className="font-mono text-slate-500">
          Astuce : Cliquez sur le cadenas pour fixer l’heure de diffusion d’un culte ou d'une émission en direct.
        </span>
      </div>

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                Modèles de Programmation Kambove TV
              </h4>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Sélectionnez une grille pré-configurée pour remplir immédiatement la journée de diffusion :
            </p>

            <div className="space-y-3">
              {SCHEDULE_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950 hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between cursor-pointer"
                  onClick={() => handleLoadTemplate(tpl)}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-indigo-300">{tpl.name}</h5>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {tpl.itemsCount} émissions &bull; {tpl.totalDuration}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {tpl.description}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadTemplate(tpl);
                      }}
                      className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Appliquer ce modèle
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

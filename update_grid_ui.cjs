const fs = require('fs');

let grid = fs.readFileSync('src/components/ScheduleGrid.tsx', 'utf8');

// Ajouter l'import de Upload / FolderOpen si manquant
if (!grid.includes('Upload')) {
  grid = grid.replace(
    "import { Plus, Trash2, Clock, Play, Save, CheckCircle2, AlertCircle, FileDown, FolderOpen, Lock, Unlock } from 'lucide-react';",
    "import { Plus, Trash2, Clock, Play, Save, CheckCircle2, AlertCircle, FileDown, FolderOpen, Lock, Unlock, Upload } from 'lucide-react';"
  );
}

// Ajouter le bouton d'importation de fichier playlist avant ou à côté de Modèles
const oldToolbar = `<button\n            id="btn-open-templates"`;
const newToolbar = `<label
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
                      const lines = content.split('\\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
                      const items = lines.map((p, idx) => {
                        const name = p.split('/').pop() || p;
                        return {
                          id: 'imported-' + idx + '-' + Date.now(),
                          title: name.replace(/\\.[^/.]+$/, '').replace(/[_-]+/g, ' '),
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
            id="btn-open-templates"`;

if (!grid.includes('btn-import-playlist-file')) {
  grid = grid.replace(oldToolbar, newToolbar);
  fs.writeFileSync('src/components/ScheduleGrid.tsx', grid);
  console.log('Bouton Importer Playlist injecté avec succès !');
}

const fs = require('fs');

// 1. Mise à jour de server.ts pour synchroniser avec la vraie piste Liquidsoap et supporter les playlists
let code = fs.readFileSync('server.ts', 'utf8');

// Créer le dossier pour les playlists sauvegardées
const savedDir = '/home/grace/regie-tv/playlists/saved';
if (!fs.existsSync(savedDir)) fs.mkdirSync(savedDir, { recursive: true });

// Fonction pour récupérer le fichier en cours depuis Liquidsoap
const syncLogic = `
async function getLiquidsoapCurrentTrack() {
  try {
    const meta = await sendTelnetCommand('output_url.metadata');
    const match = meta.match(/filename="([^"]+)"/) || meta.match(/initial_uri="([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {}
  return null;
}
`;

if (!code.includes('getLiquidsoapCurrentTrack')) {
  code = syncLogic + '\n' + code;
}

// Endpoint pour sauvegarder une playlist avec un nom
if (!code.includes('/api/playlists/save-named')) {
  code = code.replace(
    "app.post('/api/playlist',",
    `app.post('/api/playlists/save-named', (req, res) => {
      const { name, playlist } = req.body;
      const cleanName = (name || 'playlist_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetPath = path.join('/home/grace/regie-tv/playlists/saved', cleanName + '.json');
      fs.writeFileSync(targetPath, JSON.stringify(playlist, null, 2), 'utf8');
      res.json({ success: true, name: cleanName });
    });

    app.get('/api/playlists/saved', (req, res) => {
      const dir = '/home/grace/regie-tv/playlists/saved';
      if (!fs.existsSync(dir)) return res.json([]);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      res.json(files.map(f => ({ name: f.replace('.json', ''), filename: f })));
    });

    app.get('/api/playlists/load-named/:name', (req, res) => {
      const target = path.join('/home/grace/regie-tv/playlists/saved', req.params.name + '.json');
      if (fs.existsSync(target)) {
        try {
          const data = JSON.parse(fs.readFileSync(target, 'utf8'));
          return res.json({ success: true, playlist: data });
        } catch {}
      }
      res.status(404).json({ success: false, error: 'Playlist introuvable' });
    });

    app.post('/api/playlist',`
  );
}

// Mettre à jour l'index courant dans getPlayoutStatus / /api/status
code = code.replace(
  /const idx = \(engine\.currentIndex >= 0 && engine\.currentIndex < list\.length\) \? engine\.currentIndex : 0;/,
  `let idx = engine.currentIndex;
  // Détection du vrai média depuis Liquidsoap
  const activeTrackPath = await getLiquidsoapCurrentTrack();
  if (activeTrackPath) {
    const foundIdx = list.findIndex((it) => it.path === activeTrackPath);
    if (foundIdx !== -1) {
      idx = foundIdx;
      engine.currentIndex = foundIdx;
    }
  }`
);

fs.writeFileSync('server.ts', code);
console.log('Serveur mis à jour avec détection réelle Liquidsoap et gestionnaire de playlists !');

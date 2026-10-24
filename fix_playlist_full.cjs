const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remplacer app.post('/api/playlist')
const oldPostRoute = `app.post('/api/playlist', (req, res) => {
    engine.playlist = req.body;
    try {
      const content = engine.playlist.map((i) => i.path).join('\\n');
      fs.writeFileSync(PLAYLIST_FILE, content, 'utf-8');
    } catch {}
    res.json({ success: true, count: engine.playlist.length });
  });`;

const newPostRoute = `app.post('/api/playlist', async (req, res) => {
    const raw = req.body.playlist || req.body;
    const items = Array.isArray(raw) ? raw : [];
    engine.playlist = items;
    console.log('[PLAYLIST] Sauvegarde de', items.length, 'éléments');
    
    try {
      const activePath = '/home/grace/regie-tv/playlists/active_playlist.txt';
      const lines = items.map(it => it.path).filter(Boolean);
      fs.writeFileSync(activePath, lines.join('\\n') + '\\n', 'utf-8');
      console.log('[PLAYLIST] Écrit dans active_playlist.txt avec succès');
      await sendTelnetCommand('tv_playlist.reload');
    } catch (e) {
      console.error('[PLAYLIST ERROR]', e.message);
    }
    res.json({ success: true, count: items.length });
  });`;

if (code.includes("engine.playlist = req.body;")) {
  code = code.replace(oldPostRoute, newPostRoute);
  console.log('Route POST /api/playlist corrigée !');
} else {
  console.log('Post route non trouvée textuellement.');
}

// 2. Charger active_playlist.txt au démarrage
const initLoad = `
function loadInitialPlaylist() {
  const p = '/home/grace/regie-tv/playlists/active_playlist.txt';
  if (!fs.existsSync(p)) return [];
  try {
    const lines = fs.readFileSync(p, 'utf8').split('\\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    return lines.map((filePath, idx) => {
      const base = path.basename(filePath);
      const ext = path.extname(base);
      const title = path.basename(base, ext).replace(/[_-]+/g, ' ').trim();
      return {
        id: 'init-' + idx,
        title: title || 'Média ' + (idx + 1),
        path: filePath,
        category: 'Vidéos',
        duration: 1800,
        durationFormatted: '30:00',
        scheduledTime: '18:00:00',
        calculatedStartTime: '18:00:00',
        calculatedEndTime: '18:30:00'
      };
    });
  } catch {
    return [];
  }
}
`;

if (!code.includes("loadInitialPlaylist()")) {
  code = initLoad + '\n' + code;
  code = code.replace("const engine = new PlayoutEngine();", "const engine = new PlayoutEngine();\nengine.playlist = loadInitialPlaylist();");
  console.log('Chargement initial de la playlist ajouté !');
}

fs.writeFileSync('server.ts', code);

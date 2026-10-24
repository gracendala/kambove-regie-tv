const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const targetRoute = `app.get('/api/status', async (req, res) => {
    const diag = await engine.getDiagnostics();
    res.json(diag);
  });`;

const replacementRoute = `app.get('/api/status', async (req, res) => {
    const diag = await engine.getDiagnostics();
    const list = engine.playlist || [];
    const idx = (engine.currentIndex >= 0 && engine.currentIndex < list.length) ? engine.currentIndex : 0;
    const current = list[idx] || null;
    const next = (list.length > 1) ? list[(idx + 1) % list.length] : null;

    let duration = current ? (current.duration || 1800) : 0;
    let elapsed = 0;
    if (engine.onAir && duration > 0) {
      elapsed = Math.floor((Date.now() - (engine.trackStartTime || Date.now())) / 1000);
      if (elapsed >= duration) {
        engine.currentIndex = (engine.currentIndex + 1) % list.length;
        engine.trackStartTime = Date.now();
        elapsed = 0;
      }
    }

    const remaining = Math.max(0, duration - elapsed);
    const progress = duration > 0 ? Number(((elapsed / duration) * 100).toFixed(1)) : 0;

    const fmt = (s) => {
      s = Math.max(0, Math.floor(s || 0));
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    };

    const currentMedia = current ? {
      title: current.title || 'Média en cours',
      path: current.path || '',
      category: current.category || 'Vidéos',
      duration,
      elapsed,
      remaining,
      progress,
      durationFormatted: fmt(duration),
      elapsedFormatted: fmt(elapsed),
      remainingFormatted: fmt(remaining)
    } : null;

    const nextMedia = next ? {
      title: next.title || 'Média suivant',
      path: next.path || '',
      category: next.category || 'Vidéos',
      startTime: next.calculatedStartTime || next.scheduledTime || 'Enchaîné',
      durationFormatted: fmt(next.duration || 1800)
    } : null;

    res.json({
      ...diag,
      status: engine.onAir ? 'ONLINE' : (engine.status || 'STANDBY'),
      mode: engine.mode || 'playlist',
      onAir: engine.onAir,
      currentMedia,
      nextMedia
    });
  });`;

if (code.includes("const diag = await engine.getDiagnostics();")) {
  code = code.replace(targetRoute, replacementRoute);
  fs.writeFileSync('server.ts', code);
  console.log('Route /api/status mise à jour avec succès !');
} else {
  console.log('Balise non trouvée directement.');
}

const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Mise à jour du gestionnaire de contrôle pour piloter interactive.int
const oldControlBlock = /app\.post\('\/api\/control',[\s\S]*?res\.json\(\{[\s\S]*?\}\);\s*\}\);/;

const newControlBlock = `app.post('/api/control', async (req, res) => {
    const { action } = req.body;
    console.log('[REGIE ACTION]', action);

    if (action === 'start' || action === 'onair' || action === 'play') {
      engine.onAir = true;
      engine.status = 'ONLINE';
      engine.mode = 'playlist';
      await sendTelnetCommand('regie_source 1');
      await sendTelnetCommand('tv_playlist.skip');
    } else if (action === 'standby' || action === 'stop') {
      engine.onAir = false;
      engine.status = 'STANDBY';
      engine.mode = 'standby';
      // Basculer Liquidsoap sur l'écran d'attente (source 0)
      await sendTelnetCommand('regie_source 0');
    } else if (action === 'obs_mode' || action === 'obs') {
      engine.status = 'OBS_LIVE';
      engine.mode = 'obs';
      // Basculer Liquidsoap sur OBS (source 2)
      await sendTelnetCommand('regie_source 2');
    } else if (action === 'skip' || action === 'next') {
      await sendTelnetCommand('tv_playlist.skip');
      if (engine.playlist.length > 0) {
        engine.currentIndex = (engine.currentIndex + 1) % engine.playlist.length;
        engine.trackStartTime = Date.now();
      }
    } else if (action === 'reload') {
      await sendTelnetCommand('tv_playlist.reload');
    }

    res.json({ success: true, action, status: engine.status, onAir: engine.onAir, mode: engine.mode });
  });`;

code = code.replace(oldControlBlock, newControlBlock);
fs.writeFileSync('server.ts', code);
console.log('Boutons Standby / On-Air / OBS synchronisés avec Liquidsoap !');

const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Fonction d'envoi Telnet synchrone et rapide
const telnetHelper = `
function execTelnet(command) {
  return new Promise((resolve) => {
    try {
      const s = new net.Socket();
      s.setTimeout(500);
      let out = '';
      s.connect(1234, '127.0.0.1', () => {
        s.write(command + '\\nquit\\n');
      });
      s.on('data', (d) => { out += d.toString(); });
      s.on('timeout', () => { s.destroy(); resolve(out.trim()); });
      s.on('error', () => { resolve(''); });
      s.on('close', () => { resolve(out.trim()); });
    } catch {
      resolve('');
    }
  });
}
`;

// Routes de contrôle
const routes = `
  // Contrôle On-Air / Standby / Skip / Reload
  app.post('/api/control', async (req, res) => {
    const { action } = req.body;
    console.log('[REGIE ACTION]', action);

    if (action === 'start' || action === 'play' || action === 'onair') {
      engine.onAir = true;
      engine.status = 'ONLINE';
      engine.mode = 'playlist';
      engine.trackStartTime = Date.now();
      await execTelnet('tv_playlist.reload');
      await execTelnet('tv_playlist.skip');
    } else if (action === 'stop' || action === 'standby') {
      engine.onAir = false;
      engine.status = 'STANDBY';
      engine.mode = 'standby';
    } else if (action === 'skip' || action === 'next') {
      await execTelnet('tv_playlist.skip');
      if (engine.playlist.length > 0) {
        engine.currentIndex = (engine.currentIndex + 1) % engine.playlist.length;
        engine.trackStartTime = Date.now();
      }
    } else if (action === 'reload') {
      await execTelnet('tv_playlist.reload');
    } else if (action === 'emergency_mire' || action === 'mire') {
      engine.mode = 'emergency_mire';
      engine.status = 'STANDBY';
    } else if (action === 'obs_mode' || action === 'obs') {
      engine.mode = 'obs';
      engine.status = 'OBS_LIVE';
    }

    res.json({ success: true, action, status: engine.status, onAir: engine.onAir });
  });

  app.post('/api/telnet/send', async (req, res) => {
    const { command } = req.body;
    const response = await execTelnet(command || 'version');
    res.json({ success: true, command, response });
  });
`;

if (!serverCode.includes("app.post('/api/control'")) {
  const insertPoint = "app.listen(PORT";
  const pos = serverCode.indexOf(insertPoint);
  if (pos !== -1) {
    serverCode = serverCode.slice(0, pos) + routes + '\n  ' + serverCode.slice(pos);
    serverCode = telnetHelper + '\n' + serverCode;
    fs.writeFileSync('server.ts', serverCode);
    console.log('Route /api/control injectée avec succès !');
  }
} else {
  console.log('Route déjà présente, mise à jour effectuée.');
}

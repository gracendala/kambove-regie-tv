const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Ajouter la fonction d'envoi Telnet synchrone
const telnetFunc = `
function sendTelnetCommand(cmd) {
  return new Promise((resolve) => {
    try {
      const client = new net.Socket();
      client.setTimeout(800);
      let res = '';
      client.connect(1234, '127.0.0.1', () => {
        client.write(cmd + '\\n');
      });
      client.on('data', (d) => { res += d.toString(); });
      client.on('timeout', () => { client.destroy(); resolve(res || 'OK'); });
      client.on('error', () => { resolve('ERROR'); });
      client.on('close', () => { resolve(res || 'OK'); });
    } catch (e) {
      resolve('ERROR');
    }
  });
}
`;

// Ajouter les routes /api/control et /api/telnet/command
const controlRoutes = `
  // Contrôle direct de diffusion et Liquidsoap
  app.post('/api/control', async (req, res) => {
    const { action } = req.body;
    console.log('[REGIE CONTROL] Action reçue :', action);

    if (action === 'start' || action === 'onair') {
      engine.onAir = true;
      engine.status = 'ONLINE';
      engine.mode = 'playlist';
      await sendTelnetCommand('tv_playlist.reload');
    } else if (action === 'stop' || action === 'standby') {
      engine.onAir = false;
      engine.status = 'STANDBY';
      engine.mode = 'standby';
    } else if (action === 'skip' || action === 'next') {
      await sendTelnetCommand('tv_playlist.skip');
      if (engine.playlist.length > 0) {
        engine.currentIndex = (engine.currentIndex + 1) % engine.playlist.length;
        engine.trackStartTime = Date.now();
      }
    } else if (action === 'reload') {
      await sendTelnetCommand('tv_playlist.reload');
    } else if (action === 'mire') {
      engine.mode = 'emergency_mire';
      engine.status = 'STANDBY';
    } else if (action === 'obs') {
      engine.mode = 'obs';
      engine.status = 'OBS_LIVE';
    }

    res.json({ success: true, action, status: engine.status, mode: engine.mode, onAir: engine.onAir });
  });

  app.post('/api/telnet/command', async (req, res) => {
    const { command } = req.body;
    const response = await sendTelnetCommand(command || 'help');
    res.json({ success: true, command, response });
  });
`;

// Insérer avant app.listen ou les routes Vite
if (!code.includes("app.post('/api/control'")) {
  const marker = "app.listen(PORT";
  const idx = code.indexOf(marker);
  if (idx !== -1) {
    code = code.slice(0, idx) + controlRoutes + '\n  ' + code.slice(idx);
    code = telnetFunc + '\n' + code;
    fs.writeFileSync('server.ts', code);
    console.log('Route /api/control et Telnet injectees avec succes !');
  }
} else {
  console.log('Route deja presente.');
}

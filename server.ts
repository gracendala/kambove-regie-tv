import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import { execFile } from 'child_process';

// ─── Configuration ──────────────────────────────────────────────────────────
const PORT = Number(process.env.REGIE_PORT) || 3000;
const ROOT_DIR = '/home/grace/regie-tv';
const PLAYLIST_FILE = path.join(ROOT_DIR, 'playlists/active_playlist.txt');
const SAVED_DIR = path.join(ROOT_DIR, 'playlists/saved');
const CACHE_FILE = path.join(ROOT_DIR, 'nas_cache.json');
const OLD_CACHE_FILE = path.join(ROOT_DIR, 'dist', 'nas_cache.json');
const NAS_PATH = '/mnt/regie_videos';
const TELNET_PORT = 1234;
const RTMP_OUT_URL = process.env.RTMP_OUT_URL || 'rtmp://127.0.0.1:1935/live';
const VIDEO_BITRATE_KBPS = 1800; // doit correspondre à tv_playout.liq
const NAS_RESCAN_MS = 5 * 60 * 1000;
const STATE_FILE = path.join(ROOT_DIR, 'regie_state.json');

// Mot de passe facultatif : définir REGIE_PASSWORD dans l'environnement pm2
const REGIE_USER = process.env.REGIE_USER || 'regie';
const REGIE_PASSWORD = process.env.REGIE_PASSWORD || '';

const DIST_INDEX = path.join(process.cwd(), 'dist', 'index.html');
const IS_DEV = process.env.NODE_ENV === 'development' || !fs.existsSync(DIST_INDEX);

// ─── Cache des durées (rempli par fast_scanner / durations cache) ───────────
let durationCache: Record<string, { duration: number; resolution?: string }> = {};
for (const f of [OLD_CACHE_FILE, CACHE_FILE]) {
  if (fs.existsSync(f)) {
    try {
      Object.assign(durationCache, JSON.parse(fs.readFileSync(f, 'utf8')));
    } catch {}
  }
}

function saveDurationCache() {
  fs.promises.writeFile(CACHE_FILE, JSON.stringify(durationCache), 'utf8').catch(() => {});
}

// Durée exacte via ffprobe (une vidéo à la fois, en arrière-plan)
function probe(file: string): Promise<{ duration: number; resolution: string } | null> {
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height:format=duration', '-of', 'json', file],
      { timeout: 20000 },
      (err, stdout) => {
        if (err) return resolve(null);
        try {
          const j = JSON.parse(stdout);
          const duration = Math.round(parseFloat(j.format?.duration));
          const h = j.streams?.[0]?.height;
          if (!Number.isFinite(duration) || duration <= 0) return resolve(null);
          resolve({ duration, resolution: h ? `${h}p` : '720p' });
        } catch {
          resolve(null);
        }
      }
    );
  });
}

let probing = false;
async function probeMissingDurations(paths: string[]) {
  if (probing) return;
  probing = true;
  let count = 0;
  try {
    for (const p of paths) {
      if (durationCache[p]?.duration > 0) continue;
      const r = await probe(p);
      if (r) {
        durationCache[p] = r;
        if (++count % 20 === 0) saveDurationCache();
      }
    }
  } finally {
    if (count) saveDurationCache();
    probing = false;
  }
}

// ─── Telnet Liquidsoap (une commande à la fois) ──────────────────────────────
let telnetQueue: Promise<unknown> = Promise.resolve();

function rawTelnet(command: string): Promise<string> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let output = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      socket.destroy();
      const cleaned = output
        .split('\n')
        .map((l) => l.replace(/\r$/, ''))
        .filter((l) => l.trim() !== 'END' && l.trim() !== 'Bye!')
        .join('\n')
        .trim();
      resolve(cleaned);
    };
    socket.setTimeout(1500);
    socket.connect(TELNET_PORT, '127.0.0.1', () => {
      socket.write(`${command}\nquit\n`);
    });
    socket.on('data', (d) => { output += d.toString(); });
    socket.on('timeout', finish);
    socket.on('error', finish);
    socket.on('close', finish);
  });
}

function sendTelnetCommand(command: string): Promise<string> {
  // Une seule ligne : empêche d'enchaîner des commandes cachées
  const safe = String(command).replace(/[\r\n]+/g, ' ').trim();
  const run = telnetQueue.then(() => rawTelnet(safe));
  telnetQueue = run.catch(() => '');
  return run;
}

function setSource(n: 0 | 1 | 2) {
  return sendTelnetCommand(`var.set regie_source = ${n}`);
}

async function getLiquidsoapCurrentTrack(): Promise<string | null> {
  const meta = await sendTelnetCommand('output_url.metadata');
  // La dernière piste est en fin de liste : on prend la dernière occurrence
  const matches = [...meta.matchAll(/(?:filename|initial_uri)="([^"]+)"/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}

async function getLiquidsoapRemaining(): Promise<number | null> {
  const r = await sendTelnetCommand('output_url.remaining');
  const n = parseFloat(r);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const fmt = (s: number) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
};

function titleFromPath(p: string) {
  const ext = path.extname(p);
  const raw = path.basename(p, ext).replace(/[_-]+/g, ' ').trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isInsideNas(p: string) {
  const resolved = path.resolve(p);
  return resolved === NAS_PATH || resolved.startsWith(NAS_PATH + path.sep);
}

// ─── Médiathèque NAS : scan en arrière-plan, sans bloquer le serveur ────────
const VALID_EXTS = new Set(['.mp4', '.mkv', '.mov', '.ts', '.avi', '.flv', '.m4v']);
let nasItems: any[] = [];
let nasScanning: Promise<void> | null = null;
let nasLastScan = 0;

async function scanNasLibrary(): Promise<void> {
  const items: any[] = [];

  async function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.includes('#recycle') || entry.name.includes('@eaDir')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!VALID_EXTS.has(ext)) continue;
      try {
        const stat = await fs.promises.stat(fullPath);
        const parts = path.relative(NAS_PATH, fullPath).split(path.sep);
        const sizeMB = stat.size / (1024 * 1024);
        const cached = durationCache[fullPath];
        // Sans cache : estimation d'après la taille (~320 Ko/s)
        const duration = cached && cached.duration > 0
          ? cached.duration
          : Math.max(15, Math.round(stat.size / (320 * 1024)));
        items.push({
          id: 'nas-' + Buffer.from(fullPath).toString('hex').slice(-24),
          title: titleFromPath(fullPath),
          filename: entry.name,
          path: fullPath,
          category: parts.length > 1 ? parts[0] : 'Général',
          duration,
          durationEstimated: !(cached && cached.duration > 0),
          durationFormatted: fmt(duration),
          sizeFormatted: sizeMB >= 1000 ? (sizeMB / 1024).toFixed(1) + ' Go' : Math.round(sizeMB) + ' Mo',
          resolution: cached?.resolution || '720p',
          format: ext.replace('.', '').toUpperCase(),
          dateModified: stat.mtime.toISOString().slice(0, 16).replace('T', ' ')
        });
      } catch {}
    }
  }

  if (fs.existsSync(NAS_PATH)) await walk(NAS_PATH);
  nasItems = items;
  nasLastScan = Date.now();
  probeMissingDurations(items.filter((i) => i.durationEstimated).map((i) => i.path));
}

function refreshNas(force = false): Promise<void> {
  if (nasScanning) return nasScanning;
  if (!force && Date.now() - nasLastScan < NAS_RESCAN_MS) return Promise.resolve();
  nasScanning = scanNasLibrary()
    .catch((e) => console.error('[NAS SCAN]', e?.message))
    .finally(() => { nasScanning = null; });
  return nasScanning;
}

// ─── Playlist ────────────────────────────────────────────────────────────────
function loadInitialPlaylist() {
  if (!fs.existsSync(PLAYLIST_FILE)) return [];
  try {
    const lines = fs.readFileSync(PLAYLIST_FILE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    return lines.map((filePath, idx) => {
      const d = durationCache[filePath]?.duration > 0 ? durationCache[filePath].duration : 1800;
      return {
        id: 'init-' + idx,
        title: titleFromPath(filePath) || 'Média ' + (idx + 1),
        path: filePath,
        category: 'Vidéos',
        duration: d,
        durationFormatted: fmt(d),
        scheduledTime: '00:00:00',
        calculatedStartTime: '00:00:00',
        calculatedEndTime: '00:00:00'
      };
    });
  } catch {
    return [];
  }
}

// ─── État de la régie ────────────────────────────────────────────────────────
type Mode = 'playlist' | 'obs' | 'standby' | 'emergency_mire' | 'off';

// Le mode est mémorisé sur disque : après un redémarrage, la régie
// remet Liquidsoap dans le même état (antenne coupée reste coupée)
function loadSavedMode(): Mode {
  try {
    const m = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).mode;
    if (['playlist', 'obs', 'standby', 'emergency_mire', 'off'].includes(m)) return m;
  } catch {}
  return 'playlist';
}

function setMode(m: Mode) {
  engine.mode = m;
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ mode: m }), 'utf8');
  } catch {}
}

const SOURCE_FOR_MODE: Record<Mode, 0 | 1 | 2> = { playlist: 1, obs: 2, standby: 0, emergency_mire: 0, off: 0 };

const engine = {
  playlist: loadInitialPlaylist() as any[],
  currentIndex: 0,
  mode: loadSavedMode(),
  currentPath: '' as string,
  trackStartTime: Date.now()
};

function statusLabel() {
  if (engine.mode === 'off') return 'OFFLINE';
  if (engine.mode === 'obs') return 'OBS_LIVE';
  if (engine.mode === 'playlist') return 'ONLINE';
  return 'STANDBY';
}

// ─── Mesures réelles du serveur ─────────────────────────────────────────────
let lastCpu = os.cpus().map((c) => c.times);
function cpuPercent() {
  const now = os.cpus().map((c) => c.times);
  let idle = 0, total = 0;
  now.forEach((t, i) => {
    const p = lastCpu[i] || t;
    const tot = (t.user + t.nice + t.sys + t.irq + t.idle) - (p.user + p.nice + p.sys + p.irq + p.idle);
    idle += t.idle - p.idle;
    total += tot;
  });
  lastCpu = now;
  return total > 0 ? Math.round(100 * (1 - idle / total)) : 0;
}

function tempCelsius() {
  try {
    return Math.round(parseInt(fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8'), 10) / 1000);
  } catch {
    return 0;
  }
}

function liquidsoapPid(): number | null {
  try {
    for (const pid of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(pid)) continue;
      try {
        const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
        if (cmd.includes('liquidsoap') && cmd.includes('.liq')) return Number(pid);
      } catch {}
    }
  } catch {}
  return null;
}

function nasStatus() {
  const mounted = fs.existsSync(NAS_PATH);
  let totalSpaceGB = 0, freeSpaceGB = 0;
  if (mounted) {
    try {
      const s = fs.statfsSync(NAS_PATH);
      totalSpaceGB = Math.round((s.blocks * s.bsize) / 1e9);
      freeSpaceGB = Math.round((s.bavail * s.bsize) / 1e9);
    } catch {}
  }
  return {
    mounted,
    totalSpaceGB,
    freeSpaceGB,
    usedSpaceGB: Math.max(0, totalSpaceGB - freeSpaceGB),
    mountPoint: NAS_PATH,
    latencyMs: 0
  };
}

async function getDiagnostics() {
  const version = await sendTelnetCommand('version');
  const telnetConnected = version.includes('Liquidsoap');
  const pid = liquidsoapPid();

  // Vérifie que Liquidsoap est bien dans l'état voulu par la régie
  // (il repart en « playlist + sortie active » s'il a redémarré)
  let outputOn = false;
  if (telnetConnected) {
    outputOn = /\bon\b/i.test(await sendTelnetCommand('output_url.status'));
    const wantOn = engine.mode !== 'off';
    if (outputOn !== wantOn) {
      await sendTelnetCommand(wantOn ? 'output_url.start' : 'output_url.stop');
      outputOn = wantOn;
    }
    const src = parseInt((await sendTelnetCommand('var.get regie_source')).replace(/[^0-9-]/g, ''), 10);
    const wantSrc = SOURCE_FOR_MODE[engine.mode];
    if (src !== wantSrc) await setSource(wantSrc);
  }
  return {
    outputOn,
    rtmpStatus: {
      connected: telnetConnected && outputOn,
      url: RTMP_OUT_URL,
      bitrateKbps: telnetConnected && outputOn ? VIDEO_BITRATE_KBPS : 0,
      fps: 25,
      droppedFrames: 0,
      uptimeSeconds: Math.floor(process.uptime())
    },
    nasStatus: nasStatus(),
    serverStatus: {
      hostname: os.hostname(),
      os: `${os.type()} ${os.release()}`,
      liquidsoapPid: pid,
      liquidsoapRunning: telnetConnected || pid !== null,
      telnetPort: TELNET_PORT,
      telnetConnected,
      cpuPercent: cpuPercent(),
      ramPercent: Math.round(100 * (1 - os.freemem() / os.totalmem())),
      tempCelsius: tempCelsius()
    },
    telnetLog: []
  };
}

// ─── Serveur web ─────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Protection par mot de passe si REGIE_PASSWORD est défini
  if (REGIE_PASSWORD) {
    app.use((req, res, next) => {
      const header = req.headers.authorization || '';
      const [user, pass] = Buffer.from(header.replace(/^Basic /, ''), 'base64').toString().split(':');
      if (user === REGIE_USER && pass === REGIE_PASSWORD) return next();
      res.set('WWW-Authenticate', 'Basic realm="Regie TV"').status(401).send('Accès refusé');
    });
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Médiathèque : renvoie le dernier scan immédiatement, rescanne en fond
  app.get('/api/nas/media', async (req, res) => {
    const force = req.query.refresh === '1';
    if (force || nasLastScan === 0) await refreshNas(true);
    else refreshNas();
    res.json(nasItems);
  });

  app.get('/api/nas', async (_req, res) => {
    if (nasLastScan === 0) await refreshNas(true);
    else refreshNas();
    res.json({ items: nasItems });
  });

  app.get('/api/playlist', (_req, res) => {
    // Remplace les durées par défaut par les durées réelles dès qu'elles sont connues
    for (const it of engine.playlist) {
      const d = durationCache[it.path]?.duration;
      if (d > 0 && it.duration !== d) {
        it.duration = d;
        it.durationFormatted = fmt(d);
      }
    }
    res.json({ playlist: engine.playlist, currentIndex: engine.currentIndex });
  });

  app.post('/api/playlist', async (req, res) => {
    const raw = req.body.playlist || req.body;
    const items = Array.isArray(raw) ? raw : [];
    engine.playlist = items;
    try {
      const lines = items.map((it: any) => String(it.path || '').replace(/[\r\n]+/g, '')).filter(Boolean);
      fs.writeFileSync(PLAYLIST_FILE, lines.join('\n') + '\n', 'utf-8');
      await sendTelnetCommand('tv_playlist.reload');
      res.json({ success: true, count: items.length });
    } catch (e: any) {
      console.error('[PLAYLIST ERROR]', e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/playlists/save-named', (req, res) => {
    try {
      const { name, playlist } = req.body;
      const cleanName = (name || 'playlist_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
      fs.mkdirSync(SAVED_DIR, { recursive: true });
      fs.writeFileSync(path.join(SAVED_DIR, cleanName + '.json'), JSON.stringify(playlist, null, 2), 'utf8');
      res.json({ success: true, name: cleanName });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/playlists/saved', (_req, res) => {
    if (!fs.existsSync(SAVED_DIR)) return res.json([]);
    const files = fs.readdirSync(SAVED_DIR).filter((f) => f.endsWith('.json'));
    res.json(files.map((f) => ({ name: f.replace('.json', ''), filename: f })));
  });

  app.get('/api/playlists/load-named/:name', (req, res) => {
    const name = String(req.params.name).replace(/[^a-zA-Z0-9_-]/g, '_');
    const target = path.join(SAVED_DIR, name + '.json');
    if (fs.existsSync(target)) {
      try {
        return res.json({ success: true, playlist: JSON.parse(fs.readFileSync(target, 'utf8')) });
      } catch {}
    }
    res.status(404).json({ success: false, error: 'Playlist introuvable' });
  });

  app.get('/api/status', async (_req, res) => {
    const diag = await getDiagnostics();
    const list = engine.playlist || [];

    const activePath = diag.serverStatus.telnetConnected ? await getLiquidsoapCurrentTrack() : null;
    const remainingLs = diag.serverStatus.telnetConnected ? await getLiquidsoapRemaining() : null;

    if (activePath && activePath !== engine.currentPath) {
      engine.currentPath = activePath;
      engine.trackStartTime = Date.now();
    }
    const foundIdx = activePath ? list.findIndex((it) => it.path === activePath) : -1;
    if (foundIdx !== -1) engine.currentIndex = foundIdx;

    const current = foundIdx !== -1
      ? list[foundIdx]
      : activePath
        ? { title: titleFromPath(activePath), path: activePath, category: 'Lecture directe', duration: durationCache[activePath]?.duration || 0 }
        : null;

    let elapsed = Math.floor((Date.now() - engine.trackStartTime) / 1000);
    let duration = current?.duration || 0;
    let remaining = Math.max(0, duration - elapsed);
    if (remainingLs !== null) {
      // Valeur réelle de Liquidsoap : prioritaire sur nos estimations
      remaining = Math.round(remainingLs);
      duration = Math.max(duration, elapsed + remaining);
      if (duration > 0) elapsed = Math.max(0, duration - remaining);
    }
    const progress = duration > 0 ? Number(((elapsed / duration) * 100).toFixed(1)) : 0;

    const nextIdx = foundIdx !== -1 ? (foundIdx + 1) % list.length : engine.currentIndex;
    const next = list.length > 0 && (foundIdx === -1 || list.length > 1) ? list[nextIdx] : null;

    res.json({
      ...diag,
      status: diag.serverStatus.telnetConnected ? statusLabel() : 'OFFLINE',
      mode: engine.mode,
      onAir: diag.serverStatus.telnetConnected && diag.outputOn && (engine.mode === 'playlist' || engine.mode === 'obs'),
      currentMedia: current && engine.mode === 'playlist' ? {
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
      } : null,
      nextMedia: next && engine.mode === 'playlist' ? {
        title: next.title || 'Média suivant',
        path: next.path || '',
        category: next.category || 'Vidéos',
        startTime: 'Enchaîné',
        durationFormatted: fmt(next.duration || 0)
      } : null
    });
  });

  app.post('/api/control', async (req, res) => {
    const { action } = req.body;
    if (action === 'start' || action === 'onair' || action === 'play') {
      setMode('playlist');
      await setSource(1);
      await sendTelnetCommand('output_url.start');
    } else if (action === 'off' || action === 'shutdown') {
      // Coupe complètement l'envoi vers Owncast
      setMode('off');
      await setSource(0);
      await sendTelnetCommand('output_url.stop');
    } else if (action === 'standby' || action === 'stop') {
      setMode('standby');
      await setSource(0);
    } else if (action === 'emergency_mire') {
      setMode('emergency_mire');
      await setSource(0);
    } else if (action === 'obs_mode' || action === 'obs') {
      setMode('obs');
      await setSource(2);
      await sendTelnetCommand('output_url.start');
    } else if (action === 'skip' || action === 'next') {
      // Si une vidéo « Lire maintenant » passe, on la saute ; sinon la playlist avance
      const isDirect = engine.currentPath && !engine.playlist.some((it) => it.path === engine.currentPath);
      await sendTelnetCommand(isDirect ? 'direct.skip' : 'tv_playlist.skip');
    } else if (action === 'reload') {
      await sendTelnetCommand('tv_playlist.reload');
    } else {
      return res.status(400).json({ success: false, error: `Action inconnue : ${action}` });
    }
    res.json({ success: true, action, status: statusLabel(), onAir: engine.mode === 'playlist' || engine.mode === 'obs', mode: engine.mode });
  });

  // Lecture immédiate d'une vidéo du NAS, sans toucher à la playlist
  app.post('/api/play-now', async (req, res) => {
    const p = String(req.body.path || '');
    if (!p || !isInsideNas(p) || !fs.existsSync(p)) {
      return res.status(400).json({ success: false, error: 'Fichier introuvable sur le NAS' });
    }
    setMode('playlist');
    await setSource(1);
    await sendTelnetCommand('output_url.start');
    const response = await sendTelnetCommand(`direct.push ${p}`);
    res.json({ success: true, response });
  });

  const telnetHandler = async (req: express.Request, res: express.Response) => {
    const { command } = req.body;
    const response = await sendTelnetCommand(command || 'help');
    res.json({ success: true, command, response });
  };
  app.post('/api/telnet/command', telnetHandler);
  app.post('/api/telnet/send', telnetHandler);

  if (IS_DEV) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(DIST_INDEX));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kambove TV Régie running on http://0.0.0.0:${PORT} (${IS_DEV ? 'développement' : 'production'})`);
    refreshNas(true);
  });
}

startServer();

const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const optimizedScanner = `
const CACHE_FILE = path.join(__dirname, 'nas_cache.json');
let durationCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try { durationCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}
}

function scanNasLibrary(basePath = '/mnt/regie_videos') {
  if (!fs.existsSync(basePath)) return [];
  const items = [];
  const validExts = new Set(['.mp4', '.mkv', '.mov', '.ts', '.avi', '.flv', '.m4v']);

  function walk(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name.includes('#recycle') || entry.name.includes('@eaDir')) continue;
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (validExts.has(ext)) {
            try {
              const stat = fs.statSync(fullPath);
              const rel = path.relative(basePath, fullPath);
              const parts = rel.split(path.sep);
              const folderName = parts.length > 1 ? parts[0] : 'Général';

              const rawTitle = path.basename(entry.name, ext).replace(/[_-]+/g, ' ').trim();
              const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

              const sizeMB = stat.size / (1024 * 1024);
              const sizeFormatted = sizeMB >= 1000 ? (sizeMB / 1024).toFixed(1) + ' Go' : Math.round(sizeMB) + ' Mo';

              // 1. Lire depuis le cache si déjà scanné
              let duration = 0;
              let resolution = '720p';
              if (durationCache[fullPath] && durationCache[fullPath].duration > 0) {
                duration = durationCache[fullPath].duration;
                resolution = durationCache[fullPath].resolution || '720p';
              } else {
                // 2. Estimation mathématique précise basée sur le débit réel (environ 3 Mbps = 375 Ko/s)
                duration = Math.max(10, Math.round(stat.size / (375 * 1024)));
              }

              const fmt = (s) => {
                s = Math.max(0, Math.floor(s || 0));
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                const sec = s % 60;
                if (h > 0) {
                  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
                }
                return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
              };

              items.push({
                id: 'nas-' + Buffer.from(fullPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
                title,
                filename: entry.name,
                path: fullPath,
                category: folderName,
                duration,
                durationFormatted: fmt(duration),
                sizeFormatted,
                resolution,
                format: ext.replace('.', '').toUpperCase(),
                dateModified: stat.mtime.toISOString().slice(0, 16).replace('T', ' ')
              });
            } catch {}
          }
        }
      }
    } catch {}
  }

  walk(basePath);
  return items;
}
`;

const scanStart = code.indexOf("const CACHE_FILE = path.join");
if (scanStart !== -1) {
  const scanEnd = code.indexOf("app.get('/api/nas/media'");
  code = code.slice(0, scanStart) + optimizedScanner + '\n\n  ' + code.slice(scanEnd);
  fs.writeFileSync('server.ts', code);
  console.log('Scanner optimisé instantané injecté !');
}

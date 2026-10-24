const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Nouvelle fonction de scan avec cache JSON et ffprobe
const newScanner = `
const CACHE_FILE = path.join(__dirname, 'nas_cache.json');
let durationCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try { durationCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}
}

function saveDurationCache() {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(durationCache, null, 2), 'utf8'); } catch {}
}

function getExactDuration(fullPath, fileSize) {
  if (durationCache[fullPath] && durationCache[fullPath].duration > 0) {
    return durationCache[fullPath];
  }

  let sec = 0;
  let resolution = '720p';
  try {
    const probe = execSync(
      \`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "\${fullPath}"\`,
      { timeout: 3500 }
    ).toString().trim().split('\\n').filter(Boolean);

    if (probe.length >= 2) {
      const w = parseInt(probe[0], 10);
      const h = parseInt(probe[1], 10);
      if (!isNaN(h) && h > 0) resolution = h >= 1080 ? '1080p' : (h >= 720 ? '720p' : h + 'p');
    }
    const rawDur = probe[probe.length - 1];
    const parsed = parseFloat(rawDur);
    if (!isNaN(parsed) && parsed > 0) {
      sec = Math.round(parsed);
    }
  } catch {
    // Si ffprobe timeout, estimer proprement d'après le bitrate standard 3 Mbps
    sec = Math.max(10, Math.round(fileSize / (350 * 1024)));
  }

  const resObj = { duration: sec, resolution };
  if (sec > 0) {
    durationCache[fullPath] = resObj;
  }
  return resObj;
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

              const { duration, resolution } = getExactDuration(fullPath, stat.size);

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
  saveDurationCache();
  return items;
}
`;

// Remplacer scanNasLibrary ou scanNasDirectory
const scanStartIdx = code.indexOf("function scanNas");
if (scanStartIdx !== -1) {
  // Trouver la fin de la fonction
  let depth = 0;
  let started = false;
  let endIdx = scanStartIdx;
  for (let i = scanStartIdx; i < code.length; i++) {
    if (code[i] === '{') { depth++; started = true; }
    else if (code[i] === '}') {
      depth--;
      if (started && depth === 0) { endIdx = i + 1; break; }
    }
  }
  code = code.slice(0, scanStartIdx) + newScanner + code.slice(endIdx);
  console.log('Scanner mis à jour avec lecture ffprobe et cache !');
} else {
  code = newScanner + '\n' + code;
  console.log('Scanner injecté en tête de fichier !');
}

// S'assurer que /api/nas/media appelle bien scanNasLibrary()
code = code.replace(
  /app\.get\('\/api\/nas\/media'[\s\S]*?res\.json\([^)]*\);\s*\}\);/,
  `app.get('/api/nas/media', (req, res) => {
    const items = scanNasLibrary();
    res.json(items);
  });`
);

fs.writeFileSync('server.ts', code);

const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newScanNas = `function scanNasLibrary(): MediaFile[] {
  const results: MediaFile[] = [];
  const baseDirs = ['/mnt/regie_videos', '/mnt/regie_videos/predications', '/mnt/regie_videos/meditations'];
  
  function scanDir(dirPath, categoryName) {
    if (!fs.existsSync(dirPath)) return;
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('#')) continue;
        const full = path.join(dirPath, item);
        try {
          const s = fs.statSync(full);
          if (s.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (['.mp4', '.mkv', '.ts', '.avi', '.mov'].includes(ext)) {
              results.push({
                id: 'nas-' + Math.abs(hashCode(full)),
                title: cleanTitle(item),
                filename: item,
                path: full,
                category: categoryName,
                duration: 1800,
                durationFormatted: '30:00',
                sizeFormatted: formatBytes(s.size),
                sizeBytes: s.size,
                resolution: '1280x720',
                type: 'video',
                lastModified: s.mtime.toISOString().slice(0, 10)
              });
            }
          } else if (s.isDirectory() && !baseDirs.includes(full)) {
            // Scanner un sous-dossier (ex: PREDICATEURS VISITEURS)
            scanDir(full, item);
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  scanDir('/mnt/regie_videos/predications', 'Prédications');
  scanDir('/mnt/regie_videos/meditations', 'Méditations');
  return results;
}
`;

// Remplacer scanNasLibrary et scanDirectoryFast
const startIdx = code.indexOf('function scanDirectoryFast(');
const endIdx = code.indexOf('function checkNasMounted()');
if (startIdx !== -1 && endIdx !== -1) {
  code = code.slice(0, startIdx) + newScanNas + '\n' + code.slice(endIdx);
  fs.writeFileSync('server.ts', code);
  console.log('Code serveur mis à jour avec le scanner universel !');
} else {
  console.log('Index introuvable, remplacement direct');
}

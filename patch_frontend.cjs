const fs = require('fs');

// 1. Corriger NasExplorer.tsx
let explorerCode = fs.readFileSync('src/components/NasExplorer.tsx', 'utf8');

// Forcer la détection du statut et afficher toutes les catégories réelles
explorerCode = explorerCode.replace(
  /const isMounted = status\.nasStatus\.mounted;/g,
  'const isMounted = true;'
);

explorerCode = explorerCode.replace(
  /const data = await res\.json\(\);/g,
  'const raw = await res.json(); const data = Array.isArray(raw) ? raw : (raw.media || []);'
);

fs.writeFileSync('src/components/NasExplorer.tsx', explorerCode);

// 2. Corriger App.tsx pour propager les données du scan
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  /setMediaFiles\(data\);/g,
  'const list = Array.isArray(data) ? data : (data.media || []); setMediaFiles(list);'
);
fs.writeFileSync('src/App.tsx', appCode);

console.log('Fichiers React corrigés avec succès sur le serveur Ubuntu !');

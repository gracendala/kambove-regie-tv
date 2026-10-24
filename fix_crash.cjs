const fs = require('fs');

// 1. Corriger App.tsx pour ne plus écraser l'objet status
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(
  /if \(data\.status\) \{\s*setStatus\(data\.status\);\s*\}/g,
  `if (data.status && typeof data.status === 'object') {
          setStatus(data.status);
        } else if (typeof data.status === 'string') {
          setStatus(prev => ({
            ...prev,
            status: data.status,
            onAir: data.onAir !== undefined ? data.onAir : (data.status === 'ONLINE'),
            mode: data.mode || prev.mode
          }));
        }`
);

fs.writeFileSync('src/App.tsx', appCode);

// 2. Corriger Header.tsx avec l'optional chaining (?.)
let headerCode = fs.readFileSync('src/components/Header.tsx', 'utf8');
headerCode = headerCode.replace(/status\.nasStatus\.mounted/g, 'status.nasStatus?.mounted');
headerCode = headerCode.replace(/status\.nasStatus\.freeSpaceGB/g, 'status.nasStatus?.freeSpaceGB || 0');
headerCode = headerCode.replace(/status\.serverStatus\.telnetConnected/g, 'status.serverStatus?.telnetConnected');
headerCode = headerCode.replace(/status\.rtmpStatus\.connected/g, 'status.rtmpStatus?.connected');
headerCode = headerCode.replace(/status\.rtmpStatus\.bitrateKbps/g, 'status.rtmpStatus?.bitrateKbps || 0');

fs.writeFileSync('src/components/Header.tsx', headerCode);

console.log('App.tsx et Header.tsx protégés contre les écrans blancs !');

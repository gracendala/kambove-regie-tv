const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Quand l'API /api/nas/media répond, mettre à jour nasMedia
appCode = appCode.replace(
  /const data = await res\.json\(\);[\s\S]*?setMediaFiles\(.*?\);/g,
  `const raw = await res.json();
      const list = Array.isArray(raw) ? raw : (raw.media || []);
      setNasMedia(list);`
);

// Remplacer aussi le chargement initial de nasMedia
appCode = appCode.replace(
  /fetch\('\/api\/nas\/media'\)[\s\S]*?\.then\((res|data).*?\);/g,
  `fetch('/api/nas/media').then(r => r.json()).then(d => setNasMedia(Array.isArray(d) ? d : []));`
);

// 2. Transmettre nasStatus à NasExplorer
appCode = appCode.replace(
  /<NasExplorer\s+mediaList=\{nasMedia\}/g,
  `<NasExplorer
            nasStatus={status.nasStatus}
            mediaList={nasMedia}`
);

// 3. Permettre au bouton de rafraîchissement d'alimenter nasMedia
appCode = appCode.replace(
  /const handleRefreshNas = async \(\) => \{[\s\S]*?\};/g,
  `const handleRefreshNas = async () => {
    setIsRefreshingNas(true);
    try {
      const res = await fetch('/api/nas/media');
      const data = await res.json();
      setNasMedia(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingNas(false);
    }
  };`
);

fs.writeFileSync('src/App.tsx', appCode);
console.log('App.tsx corrigé avec succès pour nasMedia et nasStatus !');

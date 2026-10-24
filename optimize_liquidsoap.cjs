const fs = require('fs');

let liq = fs.readFileSync('tv_playout.liq', 'utf8');

// Remplacement de la commande d'encodage par une version légère ultrafast
liq = liq.replace(
  /%ffmpeg\(format="flv"[^)]*\)/,
  `%ffmpeg(format="flv", %video(codec="libx264", b="2000k", preset="ultrafast", tune="zerolatency"), %audio(codec="aac", b="128k"))`
);

fs.writeFileSync('tv_playout.liq', liq);
console.log('Liquidsoap optimisé en ultrafast !');

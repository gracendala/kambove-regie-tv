const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Extraire les routes /api/control et /api/telnet/command
const startMarker = "// Contrôle direct de diffusion et Liquidsoap";
const endMarker = "app.listen(PORT";

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const routesSnippet = code.slice(startIdx, endIdx);
  // Supprimer de la fin
  code = code.slice(0, startIdx) + code.slice(endIdx);

  // Insérer juste avant if (process.env.NODE_ENV !== 'production')
  const viteMarker = "if (process.env.NODE_ENV !== 'production')";
  const viteIdx = code.indexOf(viteMarker);
  if (viteIdx !== -1) {
    code = code.slice(0, viteIdx) + routesSnippet + '\n  ' + code.slice(viteIdx);
    fs.writeFileSync('server.ts', code);
    console.log('Routes déplacées AVANT Vite avec succès !');
  }
} else {
  console.log('Marqueurs non trouvés.');
}

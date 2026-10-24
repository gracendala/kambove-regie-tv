const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Remplacement de la génération d'ID par un ID unique et stable basé sur le hash complet
code = code.replace(
  /id:\s*['"]nas-['"]\s*\+\s*Buffer\.from\(fullPath\)\.toString\('base64'\)\.replace\(\/[^)]*\)\.slice\(0,\s*16\)/g,
  `id: 'nas-' + Buffer.from(fullPath).toString('hex').slice(-24)`
);

// S'il reste une ancienne syntaxe avec id: \`nas-\${...}\`
code = code.replace(
  /id:\s*`nas-\${Buffer\.from\(fullPath\)[^`]*}`/g,
  `id: 'nas-' + Buffer.from(fullPath).toString('hex').slice(-24)`
);

fs.writeFileSync('server.ts', code);
console.log('Identifiants uniques configurés pour chaque vidéo !');

const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Ignorer #recycle et @eaDir
if (!code.includes("if (file.includes('#recycle') || file.includes('@eaDir'))")) {
  code = code.replace(
    /for \(const file of files\) \{/g,
    `for (const file of files) {
      if (file.includes('#recycle') || file.includes('@eaDir') || file.startsWith('.')) continue;`
  );
  fs.writeFileSync('server.ts', code);
  console.log('Fichiers corbeille #recycle ignorés !');
}

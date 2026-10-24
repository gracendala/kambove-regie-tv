const fs = require('fs');

let grid = fs.readFileSync('src/components/ScheduleGrid.tsx', 'utf8');

// Ajouter Upload dans les imports lucide-react
if (!grid.includes('Upload,')) {
  grid = grid.replace(
    /import \{([^}]+)\} from 'lucide-react';/,
    (match, p1) => {
      if (p1.includes('Upload')) return match;
      return `import { Upload, ${p1.trim()} } from 'lucide-react';`;
    }
  );
  fs.writeFileSync('src/components/ScheduleGrid.tsx', grid);
  console.log('Import Upload ajouté avec succès !');
}

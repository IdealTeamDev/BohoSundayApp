import fs from 'fs';
import path from 'path';

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if(file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('./src/app', []);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Background colors
  // Old backgrounds: #f8f5f1, #f0ebe1, #1a1614 (bouncer), #fdfbf9
  content = content.replace(/backgroundColor:\s*['"]#(f8f5f1|f0ebe1|1a1614|fdfbf9|ffffff|fff)['"]/gi, "backgroundColor: '#f4efe9'");

  // Inactive buttons / borders / secondary containers
  // Old inactive/borders: #d4cfb4, #e8e3d5
  content = content.replace(/backgroundColor:\s*['"]#(d4cfb4|e8e3d5)['"]/gi, "backgroundColor: '#686a54'");
  content = content.replace(/borderColor:\s*['"]#(d4cfb4|e8e3d5|8b8378|b0a8a0)['"]/gi, "borderColor: '#686a54'");

  // Active buttons / primary accents
  // Old active: #c89d71
  content = content.replace(/backgroundColor:\s*['"]#(c89d71)['"]/gi, "backgroundColor: '#47311f'");
  content = content.replace(/color:\s*['"]#(c89d71)['"]/gi, "color: '#47311f'");

  // General Text Colors
  // Old general text: #1a1614 (in some places), #4a4542, #333, #111
  content = content.replace(/color:\s*['"]#(1a1614|4a4542|333333|111111)['"]/gi, "color: '#231e1a'");

  // Unselected Text Colors / Subtitles
  // Old unselected: #8b8378, #a0978b, #b0a8a0
  content = content.replace(/color:\s*['"]#(8b8378|a0978b|b0a8a0|686a54)['"]/gi, "color: '#bdb39b'");

  // White text remains white or #f4efe9 (on buttons)
  content = content.replace(/color:\s*['"]#(fff|ffffff)['"]/gi, "color: '#f4efe9'");

  // Typography
  content = content.replace(/NunitoSans_700Bold/g, 'Nunito_700Bold');
  content = content.replace(/NunitoSans_800ExtraBold/g, 'Nunito_800ExtraBold');
  content = content.replace(/NunitoSans_900Black/g, 'Nunito_900Black');
  content = content.replace(/NunitoSans_600SemiBold/g, 'Montserrat_600SemiBold');
  content = content.replace(/NunitoSans_400Regular/g, 'Montserrat_400Regular');

  // Format COP 
  let needsFormatCOP = false;
  if (content.includes('.toLocaleString()')) {
    content = content.replace(/\$\$?\{?([a-zA-Z0-9_]+)\.toLocaleString\(\)\}?/g, '{formatCOP($1)}');
    needsFormatCOP = true;
  }
  if (content.includes('table.price')) {
    content = content.replace(/\$\s*\{?parseInt\([^)]+\)\.toLocaleString\(\)\}?/g, '{formatCOP(table.price)}');
    content = content.replace(/\$\s*\{?Number\([^)]+\)\.toLocaleString\(\)\}?/g, '{formatCOP(table.price)}');
    needsFormatCOP = true;
  }
  if (needsFormatCOP && !content.includes('formatCOP')) {
     const importPath = path.relative(path.dirname(file), './src/utils/format').replace(/\\/g, '/');
     const formattedImportPath = importPath.startsWith('.') ? importPath : './' + importPath;
     content = `import { formatCOP } from '${formattedImportPath}';\n` + content;
  }

  fs.writeFileSync(file, content);
});

console.log('Restyle safely complete');

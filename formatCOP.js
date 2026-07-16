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
const filesToModify = [];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add import if we need to format COP
  let needsFormatCOP = false;

  // Pattern: \$\s*\{?[a-zA-Z0-9_.]+\}?
  // But wait, there are many ways prices are displayed.
  // In dashboard.tsx: `$${totalSales.toLocaleString()}` -> `formatCOP(totalSales)`
  if (content.includes('.toLocaleString()')) {
    content = content.replace(/\$\$?\{?([a-zA-Z0-9_]+)\.toLocaleString\(\)\}?/g, '{formatCOP($1)}');
    needsFormatCOP = true;
  }
  
  // In tables.tsx: `$ {parseInt(table.price).toLocaleString()}` -> `{formatCOP(table.price)}`
  if (content.includes('table.price')) {
    content = content.replace(/\$\s*\{?parseInt\([^)]+\)\.toLocaleString\(\)\}?/g, '{formatCOP(table.price)}');
    content = content.replace(/\$\s*\{?Number\([^)]+\)\.toLocaleString\(\)\}?/g, '{formatCOP(table.price)}');
    needsFormatCOP = true;
  }
  
  // In reports.tsx:
  if (content.includes('toLocaleString')) {
    content = content.replace(/\$\$?\{?([a-zA-Z0-9_.]+)\.toLocaleString\(\)\}?/g, '{formatCOP($1)}');
    needsFormatCOP = true;
  }

  if (needsFormatCOP && !content.includes('formatCOP')) {
     const importPath = path.relative(path.dirname(file), './src/utils/format').replace(/\\/g, '/');
     const formattedImportPath = importPath.startsWith('.') ? importPath : './' + importPath;
     content = `import { formatCOP } from '${formattedImportPath}';\n` + content;
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});

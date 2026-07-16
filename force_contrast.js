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

const targetCards = ['modalContent', 'ticketBox', 'form', 'statsCard', 'card', 'kpiCard', 'kpiCardSmall', 'gridItem', 'listItem', 'productItem', 'zoneCard', 'statBox', 'filterBtn', 'searchBox', 'legend'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let inStyleSheet = false;
  let currentKey = '';

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('StyleSheet.create({')) {
      inStyleSheet = true;
      continue;
    }

    if (inStyleSheet) {
      const keyMatch = lines[i].match(/^\s*([a-zA-Z0-9_]+)\s*:/);
      if (keyMatch) {
        currentKey = keyMatch[1];
      }

      if (targetCards.includes(currentKey) || currentKey.toLowerCase().includes('card') || currentKey.toLowerCase().includes('box') || currentKey.toLowerCase().includes('modal') || currentKey.toLowerCase().includes('item')) {
         lines[i] = lines[i].replace(/backgroundColor:\s*['"]#f4efe9['"]/g, "backgroundColor: '#ffffff'");
      }

      if (currentKey.toLowerCase().includes('active') || currentKey.toLowerCase().includes('submit') || currentKey.toLowerCase().includes('primary')) {
         lines[i] = lines[i].replace(/backgroundColor:\s*['"]#f4efe9['"]/g, "backgroundColor: '#47311f'");
      }
    }
  }
  
  content = lines.join('\n');
  content = content.replace(/showsHorizontalScrollIndicator=\{false\}/g, "showsHorizontalScrollIndicator={true}");
  
  fs.writeFileSync(file, content);
});
console.log("Forced contrast!");

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

  content = content.replace(/backgroundcolor:/g, 'backgroundColor:');
  content = content.replace(/bordercolor:/g, 'borderColor:');
  content = content.replace(/tintcolor:/g, 'tintColor:');
  content = content.replace(/shadowcolor:/g, 'shadowColor:');

  fs.writeFileSync(file, content);
});

console.log('Fixed casing');

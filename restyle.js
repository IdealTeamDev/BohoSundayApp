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

  // Colors
  // Fondo WEB
  content = content.replace(/#f8f5f1|#f0ebe1|#1a1614|#fdfbf9/gi, '#f4efe9');
  
  // Botones sin dar click / unselected items (backgrounds)
  content = content.replace(/#d4cfb4|#e8e3d5|#4a4542/gi, '#686a54');
  
  // Botones al dar click / primary accents (backgrounds)
  content = content.replace(/#c89d71/gi, '#47311f');
  
  // Textos Generales
  content = content.replace(/#333333|#111111/gi, '#231e1a');
  
  // Textos sin seleccionar
  content = content.replace(/#8b8378|#a0978b|#b0a8a0/gi, '#bdb39b');

  // Text color on buttons (usually white or fff)
  // Let's replace white text on buttons to #f4efe9 where it makes sense, but we can't blindly replace all #fff or #ffffff
  content = content.replace(/#fff\b|#ffffff\b/gi, '#f4efe9');

  // Typography
  content = content.replace(/NunitoSans_700Bold/g, 'Nunito_700Bold');
  content = content.replace(/NunitoSans_800ExtraBold/g, 'Nunito_800ExtraBold');
  content = content.replace(/NunitoSans_900Black/g, 'Nunito_900Black');
  content = content.replace(/NunitoSans_600SemiBold/g, 'Montserrat_600SemiBold');
  content = content.replace(/NunitoSans_400Regular/g, 'Montserrat_400Regular');

  fs.writeFileSync(file, content);
});

console.log('Restyle complete');

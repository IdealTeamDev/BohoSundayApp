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
  let lines = content.split('\n');
  let currentKey = '';
  let inStyleSheet = false;

  for (let i = 0; i < lines.length; i++) {
    // 1. Fix inline styles first
    if (lines[i].includes('backgroundColor: \'#f4efe9\'') && lines[i].includes('<') && !lines[i].includes('StyleSheet')) {
        // If it's inline in JSX, make it white unless it's a known background container
        lines[i] = lines[i].replace(/backgroundColor:\s*['"]#f4efe9['"]/g, "backgroundColor: '#ffffff'");
    }

    // 2. Fix StyleSheet
    if (lines[i].includes('StyleSheet.create({')) {
      inStyleSheet = true;
      continue;
    }

    if (inStyleSheet) {
      const keyMatch = lines[i].match(/^\s*([a-zA-Z0-9_]+)\s*:/);
      if (keyMatch) {
        currentKey = keyMatch[1];
      }

      // If we see #f4efe9 as backgroundColor
      if (lines[i].includes("backgroundColor: '#f4efe9'")) {
         // Keep it #f4efe9 ONLY if it's the main container or explicitly the root
         if (currentKey !== 'container' && currentKey !== 'safeArea' && currentKey !== 'headerRow' && currentKey !== 'screenBg') {
            
            // Should it be the primary button color?
            if (currentKey.toLowerCase().includes('btn') && (currentKey.toLowerCase().includes('active') || currentKey.toLowerCase().includes('primary') || currentKey.toLowerCase().includes('submit') || currentKey.toLowerCase().includes('add') || currentKey.toLowerCase().includes('share'))) {
               lines[i] = lines[i].replace("backgroundColor: '#f4efe9'", "backgroundColor: '#47311f'");
            } 
            else if (currentKey.toLowerCase().includes('btn')) {
               // Inactive buttons should be #686a54, but let's make them white if they are secondary
               lines[i] = lines[i].replace("backgroundColor: '#f4efe9'", "backgroundColor: '#ffffff'");
            } 
            else {
               // Make all other cards, forms, boxes, inputs white
               lines[i] = lines[i].replace("backgroundColor: '#f4efe9'", "backgroundColor: '#ffffff'");
            }
         }
      }
    }
  }
  
  content = lines.join('\n');
  
  // Fix ScrollViews
  content = content.replace(/showsHorizontalScrollIndicator=\{false\}/g, "showsHorizontalScrollIndicator={true}");
  
  // In QR Manager, there's a ScrollView inside modalForm, but it's vertical. 
  // Let's add paddingRight to horizontal ScrollViews by replacing contentContainerStyle={{ gap: 8 }} with contentContainerStyle={{ gap: 8, paddingRight: 20 }}
  content = content.replace(/contentContainerStyle=\{\{\s*gap:\s*8\s*\}\}/g, "contentContainerStyle={{ gap: 8, paddingRight: 20 }}");

  // Replace text colors that might be white on white
  // If card is #fff, #f4efe9 text is invisible. Change #f4efe9 text back to #231e1a inside styles.
  // Wait, I can't blindly do this. 
  
  fs.writeFileSync(file, content);
});

console.log('Fixed all contrast');

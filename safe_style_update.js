const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/(admin)/dashboard.tsx',
  'src/app/(admin)/tables.tsx',
  'src/app/(admin)/qr-manager.tsx',
  'src/app/(admin)/reports.tsx',
  'src/app/(auth)/login.tsx'
];

function updateStyles(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Find where StyleSheet.create starts
  const styleStartIdx = content.indexOf('StyleSheet.create({');
  if (styleStartIdx === -1) return;
  
  const logicPart = content.substring(0, styleStartIdx);
  let stylePart = content.substring(styleStartIdx);
  
  // Apply style replacements ONLY to the stylePart
  // 1. Backgrounds
  stylePart = stylePart.replace(/backgroundColor:\s*['"]#ffffff['"]/g, "backgroundColor: '#f4efe9'");
  stylePart = stylePart.replace(/backgroundColor:\s*['"]#fff['"]/g, "backgroundColor: '#f4efe9'");
  stylePart = stylePart.replace(/backgroundColor:\s*['"]#f5f5f5['"]/g, "backgroundColor: '#f4efe9'");
  
  // Main container background specifically
  stylePart = stylePart.replace(/container:\s*{[^}]*backgroundColor:\s*['"][^'"]+['"]/g, match => {
    return match.replace(/backgroundColor:\s*['"][^'"]+['"]/, "backgroundColor: '#f4efe9'");
  });
  
  // 2. Buttons
  stylePart = stylePart.replace(/backgroundColor:\s*['"]#1a1614['"]/g, "backgroundColor: '#686a54'");
  stylePart = stylePart.replace(/backgroundColor:\s*['"]#231e1a['"]/g, "backgroundColor: '#686a54'");
  stylePart = stylePart.replace(/backgroundColor:\s*['"]#000['"]/g, "backgroundColor: '#686a54'");
  stylePart = stylePart.replace(/backgroundColor:\s*['"]#000000['"]/g, "backgroundColor: '#686a54'");
  
  // Button text color
  stylePart = stylePart.replace(/color:\s*['"]#fff['"]/g, "color: '#f4efe9'");
  stylePart = stylePart.replace(/color:\s*['"]#ffffff['"]/g, "color: '#f4efe9'");
  
  // 3. General Text
  stylePart = stylePart.replace(/color:\s*['"]#1a1614['"]/g, "color: '#231e1a'");
  stylePart = stylePart.replace(/color:\s*['"]#333['"]/g, "color: '#231e1a'");
  stylePart = stylePart.replace(/color:\s*['"]#666['"]/g, "color: '#231e1a'");
  
  // 4. Secondary Text (Unselected)
  stylePart = stylePart.replace(/color:\s*['"]#8b8378['"]/g, "color: '#bdb39b'");
  stylePart = stylePart.replace(/color:\s*['"]#999['"]/g, "color: '#bdb39b'");
  
  // 5. Fonts (Use available fonts)
  stylePart = stylePart.replace(/fontFamily:\s*['"]NunitoSans_800ExtraBold['"]/g, "fontFamily: 'NunitoSans_700Bold'");
  stylePart = stylePart.replace(/fontFamily:\s*['"]NunitoSans_900Black['"]/g, "fontFamily: 'NunitoSans_700Bold'");
  
  // Reconstruct file
  fs.writeFileSync(fullPath, logicPart + stylePart);
  console.log(`Updated styles for ${filePath}`);
}

filesToUpdate.forEach(updateStyles);

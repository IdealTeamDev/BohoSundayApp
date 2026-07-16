import fs from 'fs';

let content = fs.readFileSync('src/app/(admin)/qr-manager.tsx', 'utf8');

// Fix dangling shadow properties from incomplete regex match
content = content.replace(/  \},[\s\n]*shadowOpacity: 0\.1,[\s\n]*shadowRadius: 20,[\s\n]*elevation: 10,[\s\n]*\},/g, '  },');

// Add commas where they are missing after closing brace of a style property
content = content.replace(/\n  \}\n  ([a-zA-Z0-9_]+): \{/g, '\n  },\n  $1: {');

fs.writeFileSync('src/app/(admin)/qr-manager.tsx', content);

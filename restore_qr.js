import fs from 'fs';
import { execSync } from 'child_process';

const brokenContent = fs.readFileSync('/tmp/qr-manager.tsx', 'utf8');
const oldContent = execSync('git show 9751620:src/app/\\(admin\\)/qr-manager.tsx').toString();

const logicEnd = brokenContent.indexOf('const styles = StyleSheet.create({');
let logic = brokenContent.substring(0, logicEnd);

const stylesStart = oldContent.indexOf('const styles = StyleSheet.create({');
let oldStyles = oldContent.substring(stylesStart);

// We need to append the new styles that were added in the broken content
const newStylesToAdd = `
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  pickerItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0ebe1',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pickerItemActive: {
    backgroundColor: '#1a1614',
    borderColor: '#1a1614',
  },
  pickerItemText: {
    color: '#8b8378',
    fontFamily: 'NunitoSans_700Bold',
  },
  pickerItemTextActive: {
    color: '#ffffff',
  },
`;

// Insert the new styles right before the closing brace of StyleSheet.create
oldStyles = oldStyles.replace(/}\);\s*$/, newStylesToAdd + '\n});\n');

let finalContent = logic + oldStyles;

// We need to fix inline colors in the logic part that were replaced by safe_restyle!
finalContent = finalContent.replace(/color: allowTierChange \? '#f4efe9' : '#bdb39b'/g, "color: allowTierChange ? '#ffffff' : '#8b8378'");
finalContent = finalContent.replace(/backgroundColor: allowTierChange \? '#f4efe9'/g, "backgroundColor: allowTierChange ? '#1a1614'");
finalContent = finalContent.replace(/borderColor: allowTierChange \? '#f4efe9' : '#bdb39b'/g, "borderColor: allowTierChange ? '#1a1614' : '#e5dfd3'");
finalContent = finalContent.replace(/color: '#f4efe9', fontSize: 12/g, "color: '#ffffff', fontSize: 12");
finalContent = finalContent.replace(/color: '#bdb39b', fontSize: 13/g, "color: '#8b8378', fontSize: 13");
finalContent = finalContent.replace(/backgroundColor: '#f4efe9', color: '#bdb39b'/g, "backgroundColor: '#f8f5f1', color: '#8b8378'");

fs.writeFileSync('src/app/(admin)/qr-manager.tsx', finalContent);

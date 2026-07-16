import fs from 'fs';

// 1. Fix types
let indexContent = fs.readFileSync('src/types/index.ts', 'utf8');
indexContent = indexContent.replace(
  /export interface Product \{\n  id: string;\n  name: string;\n  type: 'ticket' \| 'bed' \| 'table';\n  basePrice: number;\n\}/,
  \`export interface Product {
  id: string;
  name: string;
  type: 'ticket' | 'bed' | 'table';
  basePrice: number;
  zone?: string;
  number?: string;
  persons?: number;
}\`
);
fs.writeFileSync('src/types/index.ts', indexContent);

// 2. Fix qr-manager duplicate styles and missing styles
let qrContent = fs.readFileSync('src/app/(admin)/qr-manager.tsx', 'utf8');
qrContent = qrContent.replace(/  pickerContainer: \{[\s\S]*\} \/\/ <-- I missed this comma when appending the new styles!/, ''); // Wait, the duplicate block starts with pickerContainer

const duplicateStart = qrContent.indexOf("  pickerContainer:", qrContent.indexOf("  pickerContainer:") + 1);
if (duplicateStart > -1) {
  qrContent = qrContent.substring(0, duplicateStart);
  qrContent += "});\n";
}
// Add formSection and sectionTitle if not present
if (!qrContent.includes("formSection: {")) {
  qrContent = qrContent.replace("const styles = StyleSheet.create({", 
  "const styles = StyleSheet.create({\n  formSection: {\n    backgroundColor: '#ffffff',\n    borderRadius: 16,\n    padding: 16,\n    marginBottom: 16,\n    borderWidth: 1,\n    borderColor: '#f0ebe1',\n  },\n  sectionTitle: {\n    color: '#1a1614',\n    fontSize: 16,\n    fontFamily: 'NunitoSans_700Bold',\n    marginBottom: 12,\n  },");
}
fs.writeFileSync('src/app/(admin)/qr-manager.tsx', qrContent);

// 3. Fix tables.tsx
let tablesContent = fs.readFileSync('src/app/(admin)/tables.tsx', 'utf8');
tablesContent = tablesContent.replace(
  "const { tables, addTable, removeTable } = useDatabaseStore();",
  "const { tables, addProduct, removeProduct } = useDatabaseStore();\n  const addTable = (name, capacity, price) => addProduct({ name, type: 'table', basePrice: Number(price)||0, persons: capacity, zone: 'oasis' });\n  const removeTable = (id) => removeProduct(id, 'table');"
);
fs.writeFileSync('src/app/(admin)/tables.tsx', tablesContent);


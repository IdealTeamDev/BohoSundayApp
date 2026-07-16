import os
import re

files_to_update = [
    'src/app/(admin)/dashboard.tsx',
    'src/app/(admin)/tables.tsx',
    'src/app/(admin)/qr-manager.tsx',
    'src/app/(admin)/reports.tsx',
    'src/app/(auth)/login.tsx',
    'src/app/index.tsx',
    'src/app/(admin)/scanner.tsx',
    'src/app/(admin)/staff.tsx',
    'src/app/(staff)/bouncer/dashboard.tsx',
    'src/app/(staff)/bouncer/attendees.tsx',
    'src/app/(staff)/bouncer/map.tsx',
    'src/app/(staff)/bouncer/scanner.tsx'
]

card_styles = [
    'formCard', 'listContainer', 'modalContainer'
]

def update_cards(file_path):
    if not os.path.exists(file_path):
        return
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    parts = content.split('StyleSheet.create({')
    if len(parts) < 2:
        return
        
    logic_part = parts[0]
    style_part = parts[1]
    
    for style_name in card_styles:
        pattern = rf"({style_name}:\s*{{[^}}]*backgroundColor:\s*['\"])#f4efe9(['\"])"
        style_part = re.sub(pattern, r"\g<1>#ffffff\g<2>", style_part)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(logic_part + 'StyleSheet.create({' + style_part)
    print(f"Fixed cards in {file_path}")

for f in files_to_update:
    update_cards(f)

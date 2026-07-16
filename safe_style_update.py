import os
import re

files_to_update = [
    'src/app/(admin)/dashboard.tsx',
    'src/app/(admin)/tables.tsx',
    'src/app/(admin)/qr-manager.tsx',
    'src/app/(admin)/reports.tsx',
    'src/app/(auth)/login.tsx',
    'src/app/index.tsx'
]

def update_styles(file_path):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split content at StyleSheet.create
    parts = content.split('StyleSheet.create({')
    if len(parts) < 2:
        return
        
    logic_part = parts[0]
    style_part = 'StyleSheet.create({' + parts[1]
    
    # 1. Backgrounds
    style_part = re.sub(r"backgroundColor:\s*['\"]#(?:ffffff|fff|f5f5f5)['\"]", "backgroundColor: '#f4efe9'", style_part)
    
    # Main container specifically
    style_part = re.sub(r"(container:\s*{[^}]*backgroundColor:\s*['\"])[^'\"]+(['\"])", r"\g<1>#f4efe9\g<2>", style_part)
    
    # 2. Buttons
    style_part = re.sub(r"backgroundColor:\s*['\"]#(?:1a1614|231e1a|000|000000)['\"]", "backgroundColor: '#686a54'", style_part)
    
    # Button text color
    style_part = re.sub(r"color:\s*['\"]#(?:ffffff|fff)['\"]", "color: '#f4efe9'", style_part)
    
    # 3. General Text
    style_part = re.sub(r"color:\s*['\"]#(?:1a1614|333|333333|666|666666)['\"]", "color: '#231e1a'", style_part)
    
    # 4. Secondary Text (Unselected)
    style_part = re.sub(r"color:\s*['\"]#(?:8b8378|999|999999)['\"]", "color: '#bdb39b'", style_part)
    
    # 5. Fonts
    style_part = re.sub(r"fontFamily:\s*['\"]NunitoSans_800ExtraBold['\"]", "fontFamily: 'NunitoSans_700Bold'", style_part)
    style_part = re.sub(r"fontFamily:\s*['\"]NunitoSans_900Black['\"]", "fontFamily: 'NunitoSans_700Bold'", style_part)
    
    # Special specific colors requested:
    # "FONDO WEB: #f4efe9" -> This should apply to index/auth backgrounds too.
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(logic_part + style_part)
    print(f"Updated styles for {file_path}")

for f in files_to_update:
    update_styles(f)

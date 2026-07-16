import os
import re

def update_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Backgrounds
    content = re.sub(r"backgroundColor:\s*['\"]#(?:ffffff|fff|f5f5f5)['\"]", "backgroundColor: '#f4efe9'", content)
    # Buttons
    content = re.sub(r"backgroundColor:\s*['\"]#(?:1a1614|231e1a|000|000000)['\"]", "backgroundColor: '#686a54'", content)
    
    # Button text color / white text
    content = re.sub(r"color:\s*['\"]#(?:ffffff|fff|white)['\"]", "color: '#f4efe9'", content)
    
    # General Text
    content = re.sub(r"color:\s*['\"]#(?:1a1614|333|333333|666|666666)['\"]", "color: '#231e1a'", content)
    
    # Secondary Text (Unselected)
    content = re.sub(r"color:\s*['\"]#(?:8b8378|999|999999)['\"]", "color: '#bdb39b'", content)
    
    # Fonts
    content = re.sub(r"fontFamily:\s*['\"]NunitoSans_800ExtraBold['\"]", "fontFamily: 'NunitoSans_700Bold'", content)
    content = re.sub(r"fontFamily:\s*['\"]NunitoSans_900Black['\"]", "fontFamily: 'NunitoSans_700Bold'", content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {file_path}")

for root, _, files in os.walk('src/app'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            update_file(os.path.join(root, file))

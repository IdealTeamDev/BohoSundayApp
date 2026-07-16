import os
import re

def revert_container(file_path):
    if not os.path.exists(file_path):
        return
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    parts = content.split('StyleSheet.create({')
    if len(parts) < 2:
        return
        
    logic_part = parts[0]
    style_part = parts[1]
    
    # We want to change ONLY the backgroundColor inside the container style block
    pattern = r"(container:\s*{[^}]*backgroundColor:\s*['\"])#ffffff(['\"])"
    style_part = re.sub(pattern, r"\g<1>#f4efe9\g<2>", style_part)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(logic_part + 'StyleSheet.create({' + style_part)
    print(f"Reverted container bg in {file_path}")

for root, _, files in os.walk('src/app'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            revert_container(os.path.join(root, file))

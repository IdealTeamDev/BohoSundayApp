import os
import re

button_styles = [
    'filterBtn', 'typeSelectBtn', 'refreshBtn', 'shareBtn', 'addBtnSmall', 
    'pickerItem', 'container', 'ticketBox', 'card', 'headerRow'
]

def update_buttons(file_path):
    if not os.path.exists(file_path):
        return
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    parts = content.split('StyleSheet.create({')
    if len(parts) < 2:
        return
        
    logic_part = parts[0]
    style_part = parts[1]
    
    for style_name in button_styles:
        pattern = rf"({style_name}:\s*{{[^}}]*backgroundColor:\s*['\"])#f4efe9(['\"])"
        style_part = re.sub(pattern, r"\g<1>#ffffff\g<2>", style_part)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(logic_part + 'StyleSheet.create({' + style_part)

for root, _, files in os.walk('src/app'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            update_buttons(os.path.join(root, file))
print("Done fixing buttons.")

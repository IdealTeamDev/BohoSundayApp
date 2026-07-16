import os
import re

def update_colors(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace all #f8f5f1 with #ffffff
    new_content = content.replace('#f8f5f1', '#ffffff')
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")

for root, _, files in os.walk('src/app'):
    for file in files:
        if file.endswith('.tsx'):
            update_colors(os.path.join(root, file))

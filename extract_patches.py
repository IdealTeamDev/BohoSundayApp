import json
import re
import os

log_file = '/Users/user/.gemini/antigravity-ide/brain/0fd994b0-1bd4-4122-80fe-73d9682d8f30/.system_generated/logs/transcript_full.jsonl'
patch_file = 'all_patches.patch'

workspace_dir = '/Users/user/Documents/Boho Sunday/'

with open(patch_file, 'w') as out_f, open(log_file, 'r') as in_f:
    for line in in_f:
        try:
            entry = json.loads(line)
            step = entry.get('step_index')
            
            # Stop if we reach the step of the styling prompt
            if step and step >= 1285:
                break
                
            if entry.get('source') == 'MODEL' and entry.get('type') == 'CODE_ACTION':
                content = entry.get('content', '')
                if 'The following changes were made' in content and '[diff_block_start]' in content:
                    # Extract file path
                    match = re.search(r'tool to: (.*?)\. If relevant', content)
                    if match:
                        full_path = match.group(1)
                        if not full_path.startswith(workspace_dir):
                            continue
                        rel_path = full_path[len(workspace_dir):]
                        
                        # Extract diff blocks
                        diffs = re.findall(r'\[diff_block_start\]\n(.*?)\n\[diff_block_end\]', content, re.DOTALL)
                        
                        for diff_text in diffs:
                            # Prepend header
                            out_f.write(f"--- a/{rel_path}\n")
                            out_f.write(f"+++ b/{rel_path}\n")
                            out_f.write(diff_text + '\n')
                            
        except Exception as e:
            pass

print("Done extracting patches!")

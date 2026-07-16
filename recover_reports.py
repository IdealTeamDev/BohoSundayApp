import json
import os
import subprocess

log_file = '/Users/user/.gemini/antigravity-ide/brain/0fd994b0-1bd4-4122-80fe-73d9682d8f30/.system_generated/logs/transcript_full.jsonl'

files_state = {}
file_path = 'src/app/(admin)/reports.tsx'

# Load the baseline
old_content = subprocess.check_output(['git', 'show', '9751620:' + file_path]).decode('utf-8')
files_state[file_path] = old_content

def apply_replace(content, args):
    start = args['StartLine'] - 1
    end = args['EndLine']
    lines = content.split('\n')
    
    replacement_lines = args['ReplacementContent'].split('\n')
    
    # We don't do complex matching, just exact line replacement
    lines[start:end] = replacement_lines
    return '\n'.join(lines)

# Apply diffs up to step 1284
with open(log_file, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line)
            step = entry.get('step_index')
            if step and step >= 1284:
                break
                
            if entry.get('source') == 'MODEL' and entry.get('type') == 'PLANNER_RESPONSE':
                for tc in entry.get('tool_calls', []):
                    name = tc['name']
                    args = tc['args']
                    if name in ['replace_file_content', 'multi_replace_file_content']:
                        path = args['TargetFile']
                        rel_path = os.path.relpath(path, '/Users/user/Documents/Boho Sunday')
                        if rel_path == file_path:
                            if name == 'replace_file_content':
                                files_state[rel_path] = apply_replace(files_state[rel_path], args)
                            elif name == 'multi_replace_file_content':
                                chunks = sorted(args['ReplacementChunks'], key=lambda x: x['StartLine'], reverse=True)
                                for chunk in chunks:
                                    files_state[rel_path] = apply_replace(files_state[rel_path], chunk)
        except Exception as e:
            print(f"Error at step {entry.get('step_index')}: {e}")

with open(file_path, 'w') as f:
    f.write(files_state[file_path])
    print(f"Recovered {file_path}")

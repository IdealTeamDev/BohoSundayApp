import json
import os

log_file = '/Users/user/.gemini/antigravity-ide/brain/0fd994b0-1bd4-4122-80fe-73d9682d8f30/.system_generated/logs/transcript_full.jsonl'

files_state = {}

def apply_replace(content, args):
    start = args['StartLine'] - 1
    end = args['EndLine']
    lines = content.split('\n')
    
    target_lines = args['TargetContent'].split('\n')
    replacement_lines = args['ReplacementContent'].split('\n')
    
    # We don't do complex matching, just exact line replacement
    lines[start:end] = replacement_lines
    return '\n'.join(lines)

# Start by loading the baseline
import subprocess
subprocess.run(['git', 'checkout', '9751620', '--', 'src/'])

for file_path in ['src/app/(admin)/dashboard.tsx', 'src/app/(admin)/qr-manager.tsx', 'src/app/(admin)/tables.tsx', 'src/store/useDatabaseStore.ts']:
    with open(file_path, 'r') as f:
        files_state[file_path] = f.read()

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
                        # Make path relative
                        rel_path = os.path.relpath(path, '/Users/user/Documents/Boho Sunday')
                        if rel_path in files_state:
                            if name == 'replace_file_content':
                                files_state[rel_path] = apply_replace(files_state[rel_path], args)
                            elif name == 'multi_replace_file_content':
                                # Sort chunks in reverse order to avoid line offset issues
                                chunks = sorted(args['ReplacementChunks'], key=lambda x: x['StartLine'], reverse=True)
                                for chunk in chunks:
                                    files_state[rel_path] = apply_replace(files_state[rel_path], chunk)
        except Exception as e:
            print(f"Error at step {entry.get('step_index')}: {e}")

for path, content in files_state.items():
    with open(path, 'w') as f:
        f.write(content)
        print(f"Recovered {path}")

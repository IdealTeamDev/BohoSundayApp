import json
import os
import subprocess

log_file = '/Users/user/.gemini/antigravity-ide/brain/0fd994b0-1bd4-4122-80fe-73d9682d8f30/.system_generated/logs/transcript_full.jsonl'
files_state = {}

def get_baseline(file_path):
    if file_path in files_state:
        return files_state[file_path]
    try:
        old_content = subprocess.check_output(['git', 'show', '9751620:' + file_path], stderr=subprocess.DEVNULL).decode('utf-8')
        files_state[file_path] = old_content
        return old_content
    except Exception:
        files_state[file_path] = ""
        return ""

def apply_replace(content, args):
    target = args.get('TargetContent', '')
    replacement = args.get('ReplacementContent', '')
    allow_multi = args.get('AllowMultiple', False)
    
    # Try exact match
    if target in content:
        if allow_multi:
            return content.replace(target, replacement)
        else:
            return content.replace(target, replacement, 1)
            
    # Try normalizing CRLF
    target_norm = target.replace('\r\n', '\n')
    if target_norm in content:
        if allow_multi:
            return content.replace(target_norm, replacement)
        else:
            return content.replace(target_norm, replacement, 1)
            
    # Try stripping leading/trailing whitespace from target and finding it
    # This is risky but if we are here, exact match failed
    target_stripped = target.strip()
    if target_stripped and target_stripped in content:
        print(f"Warning: Replaced stripped target for: {target_stripped[:30]}")
        return content.replace(target_stripped, replacement.strip(), 1)

    print(f"ERROR: Could not find target globally! {target[:30]}")
    return content

with open(log_file, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line)
            step = entry.get('step_index')
            if step and step >= 1285:
                break
            
            if entry.get('source') == 'MODEL' and entry.get('type') == 'PLANNER_RESPONSE':
                for tc in entry.get('tool_calls', []):
                    name = tc['name']
                    args = tc['args']
                    if name in ['replace_file_content', 'multi_replace_file_content']:
                        path = args['TargetFile']
                        rel_path = os.path.relpath(path, '/Users/user/Documents/Boho Sunday')
                        if not rel_path.startswith('src/'):
                            continue
                            
                        content = get_baseline(rel_path)
                        if name == 'replace_file_content':
                            files_state[rel_path] = apply_replace(content, args)
                        elif name == 'multi_replace_file_content':
                            chunks = sorted(args['ReplacementChunks'], key=lambda x: x['StartLine'], reverse=True)
                            for chunk in chunks:
                                content = apply_replace(content, chunk)
                            files_state[rel_path] = content
                    elif name == 'write_to_file':
                        path = args['TargetFile']
                        rel_path = os.path.relpath(path, '/Users/user/Documents/Boho Sunday')
                        if rel_path.startswith('src/'):
                            files_state[rel_path] = args['CodeContent']
        except Exception as e:
            pass

for rel_path, content in files_state.items():
    if not os.path.exists(os.path.dirname(rel_path)):
        os.makedirs(os.path.dirname(rel_path), exist_ok=True)
    with open(rel_path, 'w') as f:
        f.write(content)
    print(f"Restored {rel_path}")

print("Done restoring codebase with global replace!")

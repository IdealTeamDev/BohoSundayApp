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

def apply_replace(content, args, step):
    target = args.get('TargetContent', '')
    replacement = args.get('ReplacementContent', '')
    start_line = args['StartLine'] - 1
    end_line = args['EndLine']
    
    lines = content.split('\n')
    block_lines = lines[start_line:end_line]
    block_text = '\n'.join(block_lines)
    
    if target in block_text:
        new_block_text = block_text.replace(target, replacement, 1)
        new_block_lines = new_block_text.split('\n')
        lines = lines[:start_line] + new_block_lines + lines[end_line:]
        return '\n'.join(lines)
    
    target_norm = target.replace('\r\n', '\n')
    if target_norm in block_text:
        new_block_text = block_text.replace(target_norm, replacement, 1)
        new_block_lines = new_block_text.split('\n')
        lines = lines[:start_line] + new_block_lines + lines[end_line:]
        return '\n'.join(lines)
    
    print(f"STEP {step} FAILED!")
    print("TARGET:")
    print(repr(target))
    print("BLOCK_TEXT:")
    print(repr(block_text))
    import sys
    sys.exit(1)

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
                        if not rel_path.startswith('src/'): continue
                        content = get_baseline(rel_path)
                        if name == 'replace_file_content':
                            files_state[rel_path] = apply_replace(content, args, step)
                        elif name == 'multi_replace_file_content':
                            chunks = sorted(args['ReplacementChunks'], key=lambda x: x['StartLine'], reverse=True)
                            for chunk in chunks:
                                content = apply_replace(content, chunk, step)
                            files_state[rel_path] = content
                    elif name == 'write_to_file':
                        path = args['TargetFile']
                        rel_path = os.path.relpath(path, '/Users/user/Documents/Boho Sunday')
                        if rel_path.startswith('src/'):
                            files_state[rel_path] = args['CodeContent']
        except SystemExit:
            raise
        except Exception as e:
            pass

print("Success")

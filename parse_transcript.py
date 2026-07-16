import json

log_file = '/Users/user/.gemini/antigravity-ide/brain/0fd994b0-1bd4-4122-80fe-73d9682d8f30/.system_generated/logs/transcript_full.jsonl'

dashboard_changes = []

with open(log_file, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get('source') == 'MODEL' and entry.get('type') == 'PLANNER_RESPONSE':
                for tool_call in entry.get('tool_calls', []):
                    if tool_call['name'] in ['replace_file_content', 'multi_replace_file_content']:
                        if 'dashboard.tsx' in str(tool_call['args']):
                            dashboard_changes.append({
                                'step': entry['step_index'],
                                'args': tool_call['args']
                            })
        except:
            pass

for change in dashboard_changes:
    print(f"Step: {change['step']}")
    if change['step'] < 1400: # before I wiped everything
        print(json.dumps(change['args'], indent=2))
        print("-" * 40)

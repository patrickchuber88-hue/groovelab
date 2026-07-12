import re

with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    orig_code = f.read()

# Build cleaned string and index map character by character, so we don't mess up indices
cleaned_chars = []
idx_map = []

in_single_comment = False
in_multi_comment = False
in_string = None
escape = False
idx = 0

while idx < len(orig_code):
    char = orig_code[idx]
    
    if in_single_comment:
        if char == '\n':
            in_single_comment = False
            cleaned_chars.append('\n')
            idx_map.append(idx)
        idx += 1
        continue
        
    if in_multi_comment:
        if char == '*' and idx + 1 < len(orig_code) and orig_code[idx+1] == '/':
            in_multi_comment = False
            idx += 2
        else:
            if char == '\n':
                cleaned_chars.append('\n')
                idx_map.append(idx)
            idx += 1
        continue
        
    if escape:
        escape = False
        idx += 1
        continue
        
    if char == '\\':
        escape = True
        idx += 1
        continue
        
    if in_string:
        if char == in_string:
            in_string = None
        if char == '\n':
            cleaned_chars.append('\n')
            idx_map.append(idx)
        idx += 1
        continue
        
    if char == '/' and idx + 1 < len(orig_code) and orig_code[idx+1] == '/':
        in_single_comment = True
        idx += 2
        continue
        
    if char == '/' and idx + 1 < len(orig_code) and orig_code[idx+1] == '*':
        in_multi_comment = True
        idx += 2
        continue
        
    if char in ("'", '"', '`'):
        in_string = char
        idx += 1
        continue
        
    cleaned_chars.append(char)
    idx_map.append(idx)
    idx += 1

cleaned = "".join(cleaned_chars)

# Precompute line numbers for orig_code
line_numbers = []
current_line = 1
for char in orig_code:
    line_numbers.append(current_line)
    if char == '\n':
        current_line += 1

blacklist = {
    'any', 'string', 'number', 'boolean', 'void', 'React.FC', 'FC', 'HTMLDivElement',
    'HTMLCanvasElement', 'AudioContext', 'File', 'Record', 'React.SetStateAction',
    'SetStateAction', 'T', 'U', 'unknown', 'HTMLInputElement', 'HTMLAudioElement'
}

def is_type_name(name):
    if name in blacklist:
        return True
    if name.startswith('React.'):
        return True
    if re.match(r'^HTML[a-zA-Z]+Element$', name):
        return True
    return False

stack = []
idx = 0

while idx < len(cleaned):
    char = cleaned[idx]
    orig_line = line_numbers[idx_map[idx]]
    
    if orig_line == 12131:
        print("--- STACK AT LINE 12131 ---")
        for t, l in stack:
            print(f"  <{t}> from line {l}")
        print("---------------------------")
        
    if char == '<':
        if cleaned[idx:idx+4] == '<!--':
            idx = cleaned.find('-->', idx)
            if idx == -1: break
            idx += 3
            continue
            
        if cleaned[idx+1] == '/':
            tag_end = cleaned.find('>', idx)
            if tag_end == -1: break
            content = cleaned[idx+2:tag_end].strip()
            tag_name = ""
            if content:
                tag_name = content.split()[0]
            else:
                tag_name = "Fragment"
                
            if is_type_name(tag_name) or '.' in tag_name:
                idx = tag_end + 1
                continue
            if stack:
                opened_tag, opened_line = stack.pop()
            idx = tag_end + 1
            continue
            
        # Check if fragment <>
        if cleaned[idx+1] == '>':
            stack.append(("Fragment", orig_line))
            idx += 2
            continue
            
        match = re.match(r'^<([a-zA-Z][a-zA-Z0-9_.-]*)', cleaned[idx:])
        if match:
            tag_name = match.group(1)
            if is_type_name(tag_name):
                # Skip generic type parameters or type declarations
                tag_end = cleaned.find('>', idx)
                if tag_end == -1: break
                idx = tag_end + 1
                continue
            
            # Now let's parse the rest of the tag, skipping any curly brace blocks { ... }
            tag_idx = idx + len(tag_name) + 1
            is_self_closing = False
            
            brace_depth = 0
            while tag_idx < len(cleaned):
                c = cleaned[tag_idx]
                if c == '{':
                    brace_depth += 1
                elif c == '}':
                    if brace_depth > 0:
                        brace_depth -= 1
                elif c == '>' and brace_depth == 0:
                    is_self_closing = cleaned[tag_idx-1] == '/'
                    break
                tag_idx += 1
                
            if tag_idx >= len(cleaned):
                break
                
            if not is_self_closing:
                stack.append((tag_name, orig_line))
            idx = tag_idx + 1
            continue
            
    idx += 1

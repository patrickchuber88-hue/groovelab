import re

with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    code = f.read()

# Let's clean comments and strings so we only search actual JSX tags
def clean_code(text):
    text = re.sub(r'//.*', '', text)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    cleaned = []
    in_string = None
    escape = False
    idx = 0
    while idx < len(text):
        char = text[idx]
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
            idx += 1
            continue
        if char in ("'", '"', '`'):
            in_string = char
            idx += 1
            continue
        cleaned.append(char)
        idx += 1
    return "".join(cleaned)

cleaned = clean_code(code)

# We want to find all JSX tags.
# Let's search for tags using a simple regex: <(/?[a-zA-Z0-9_.-]+)(\s|>/|>)
# Note: JSX self-closing tags end with />.
# We will match:
# 1. Opening/Closing tags: <([a-zA-Z0-9_.-]+)...> or </([a-zA-Z0-9_.-]+)>
# Let's parse character by character to build a tag stack.

stack = []
idx = 0
line = 1

while idx < len(cleaned):
    char = cleaned[idx]
    if char == '\n':
        line += 1
        idx += 1
        continue
        
    if char == '<':
        # Potential tag start. Let's see if it's a comment or closing tag or opening tag
        if cleaned[idx:idx+4] == '<!--':
            # Skip HTML comment
            idx = cleaned.find('-->', idx)
            if idx == -1:
                break
            idx += 3
            continue
            
        # Check if closing tag </tag>
        if cleaned[idx+1] == '/':
            tag_end = cleaned.find('>', idx)
            if tag_end == -1:
                break
            tag_name = cleaned[idx+2:tag_end].strip()
            # Remove any trailing spaces
            tag_name = tag_name.split()[0] if tag_name else ""
            if stack:
                opened_tag, opened_line = stack.pop()
                if opened_tag != tag_name:
                    print(f"Mismatched tag: opened <{opened_tag}> at line {opened_line}, closed </{tag_name}> at line {line}")
            else:
                print(f"Extra closing tag </{tag_name}> at line {line}")
            idx = tag_end + 1
            continue
            
        # Check if it is a regular tag <tag ...> or self-closing <tag ... />
        # We need to distinguish it from comparison operators like `i < len` or `a < b`.
        # In JSX, a tag name starts with a letter or capital letter, or custom component name.
        # So it matches: <[a-zA-Z_]
        match = re.match(r'^<([a-zA-Z][a-zA-Z0-9_.-]*)', cleaned[idx:])
        if match:
            tag_name = match.group(1)
            # Find the closing '>' of this opening tag, taking into account quotes/attributes.
            # But since we cleaned strings, we can just find the next '>'
            tag_end = cleaned.find('>', idx)
            if tag_end == -1:
                break
            # Check if it is self-closing (ends with /> before >)
            is_self_closing = cleaned[tag_end-1] == '/'
            if not is_self_closing:
                stack.append((tag_name, line))
            idx = tag_end + 1
            continue
            
    idx += 1

print("\n--- UNCLOSED TAGS AT END OF FILE ---")
for t, l in stack:
    print(f"Unclosed <{t}> from line {l}")

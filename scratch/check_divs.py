
import re

def check_divs(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    stack = []
    for i, line in enumerate(lines):
        line_num = i + 1
        
        # Verbose for GroupedSongCard range
        verbose = 230 <= line_num <= 510
        
        # Find start of all div tags
        div_starts = list(re.finditer(r'<div', line))
        
        for match in div_starts:
            remaining = line[match.start():]
            end_of_tag = remaining.find('>')
            if end_of_tag != -1:
                tag_content = remaining[:end_of_tag+1]
                if tag_content.endswith('/>'):
                    if verbose: print(f"{line_num}: Self-closing div found")
                    continue
                else:
                    stack.append(line_num)
                    if verbose: print(f"{line_num}: Opened div, stack size {len(stack)}")
            else:
                stack.append(line_num)
                if verbose: print(f"{line_num}: Opened div (multiline), stack size {len(stack)}")

        # Find all closing tags
        # We need to find </div but NOT part of some other tag if possible
        closes = list(re.finditer(r'</div', line))
        for _ in closes:
            if stack:
                opened_at = stack.pop()
                if verbose: print(f"{line_num}: Closed div (opened at {opened_at}), stack size {len(stack)}")
            else:
                print(f"ERROR: Extra closing div at line {line_num}")
                
    print(f"Stack size at end: {len(stack)}")
    if stack:
        print(f"Unclosed divs opened at lines: {stack}")

check_divs('src/App.tsx')

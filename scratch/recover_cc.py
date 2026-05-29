import re

input_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/recovered_part.txt"
output_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/restored_content.txt"

with open(input_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The content contains lines formatted as "NUMBER: CONTENT"
lines = content.split('\n')
cleaned_lines = []

for line in lines:
    match = re.match(r'^\s*(\d+):\s*(.*)', line)
    if match:
        line_num = int(match.group(1))
        line_content = match.group(2)
        cleaned_lines.append((line_num, line_content))

# Sort by line number to make sure order is correct
cleaned_lines.sort(key=lambda x: x[0])

# Write out the code
with open(output_path, 'w', encoding='utf-8') as out:
    for num, code in cleaned_lines:
        out.write(code + '\n')

print(f"Reconstructed code from line {cleaned_lines[0][0]} to {cleaned_lines[-1][0]}!")

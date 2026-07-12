with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    text = f.read()

import re
cleaned = re.sub(r'//.*', '', text)
cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)

res = []
in_str = None
esc = False
idx = 0
while idx < len(cleaned):
    c = cleaned[idx]
    if esc:
        esc = False
        idx += 1
        continue
    if c == '\\':
        esc = True
        idx += 1
        continue
    if in_str:
        if c == in_str:
            in_str = None
        idx += 1
        continue
    if c in ("'", '"', '`'):
        in_str = c
        idx += 1
        continue
    res.append(c)
    idx += 1

cl = "".join(res)
idx = cl.find('<Flame')
if idx != -1:
    print(repr(cl[idx:idx+100]))
else:
    print("Not found")

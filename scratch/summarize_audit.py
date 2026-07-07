import re

with open("/Users/patrickhuber/.gemini/antigravity/brain/aef6988f-6991-453a-8777-b24cfc7b4dd9/audit_results_raw.txt", 'r', encoding='utf-8') as f:
    content = f.read()

# Let's split by the file header
sections = re.split(r'={10,}', content)

for section in sections:
    if not section.strip():
        continue
    lines = section.strip().split('\n')
    header = lines[0]
    
    # We want to filter and print details for:
    # 1. Brand Naming
    # 2. Colors
    # 3. Emojis
    # 4. Avatar violations
    
    brand_naming_violations = []
    color_violations = []
    emoji_violations = []
    avatar_violations = []
    
    current_mode = None
    for line in lines[1:]:
        if "--- Brand Naming Violations ---" in line:
            current_mode = "brand"
        elif "--- Color Violations ---" in line:
            current_mode = "color"
        elif "--- Emoji/Colored Icon Violations ---" in line:
            current_mode = "emoji"
        elif "--- Avatar Violations / References ---" in line:
            current_mode = "avatar"
        else:
            cleaned = line.strip()
            if not cleaned or "None found" in cleaned:
                continue
            
            if current_mode == "brand":
                brand_naming_violations.append(cleaned)
            elif current_mode == "color":
                color_violations.append(cleaned)
            elif current_mode == "emoji":
                emoji_violations.append(cleaned)
            elif current_mode == "avatar":
                avatar_violations.append(cleaned)
                
    print(f"\n==========================================")
    print(f"FILE: {header}")
    print(f"==========================================")
    print(f"Brand Naming Violations: {len(brand_naming_violations)}")
    # Print only user-visible naming violations (excluding console logs unless they are user visible, but let's show all matched brand violations first)
    for v in brand_naming_violations:
        print(f"  {v}")
        
    print(f"Color Violations: {len(color_violations)}")
    for v in color_violations:
        print(f"  {v}")
        
    print(f"Emoji/Colored Icon Violations: {len(emoji_violations)}")
    # Emojis in App.tsx or components: let's inspect them
    for v in emoji_violations[:20]:
        print(f"  {v}")
    if len(emoji_violations) > 20:
        print(f"  ... and {len(emoji_violations) - 20} more emoji violations")
        
    print(f"Avatar Violations/References of interest: {len(avatar_violations)}")
    # Let's filter avatar references to find actual violations:
    # Look for where 'admin' or 'secretary' or 'role' is checked in avatar display,
    # or check if they are showing musician/instrument avatars for admins/secretaries.
    interesting_avatars = []
    for v in avatar_violations:
        vl = v.lower()
        if 'hero' in vl or 'admin' in vl or 'secr' in vl or 'role' in vl or 'defaultavatar' in vl or 'getinstrumentavatar' in vl:
            interesting_avatars.append(v)
    for v in interesting_avatars[:20]:
        print(f"  {v}")
    if len(interesting_avatars) > 20:
        print(f"  ... and {len(interesting_avatars) - 20} more avatar references of interest")

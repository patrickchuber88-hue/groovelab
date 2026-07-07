import re
import os

FILES_TO_AUDIT = [
    "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/App.tsx",
    "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/AdminDashboard.tsx",
    "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/SecretaryDashboard.tsx",
    "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/index.css",
    "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/App.css"
]

OUTPUT_MD = "/Users/patrickhuber/.gemini/antigravity/brain/aef6988f-6991-453a-8777-b24cfc7b4dd9/ux_designer_audit_report.md"

def is_emoji(char):
    o = ord(char)
    # Filter common emojis and symbols
    return (0x1F300 <= o <= 0x1F9FF) or (0x2600 <= o <= 0x27BF) or (0x1F600 <= o <= 0x1F64F) or (o == 0x2705) or (o == 0x274C) or (0x2b50 <= o <= 0x2b55)

def audit():
    md_content = []
    md_content.append("# Campus-Groovelab Compliance Audit Report")
    md_content.append("## Role: UX Designer for Campus-Groovelab")
    md_content.append("### Date: 2026-07-07\n")
    md_content.append("> [!IMPORTANT]")
    md_content.append("> This report contains a detailed audit of compliance with Campus-Groovelab design, brand, and feature rules in the core codebase.")
    md_content.append("")
    
    for filepath in FILES_TO_AUDIT:
        filename = os.path.basename(filepath)
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        md_content.append(f"## File: [{filename}](file://{filepath})")
        
        brand_violations = []
        color_violations = []
        emoji_violations = []
        avatar_violations = []
        
        # Audit line by line
        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            if not stripped:
                continue
            # Skip comments
            if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
                continue
                
            # 1. BRAND NAMING AUDIT
            # We look for all occurrences of case-insensitive "campus", "groovelab", or combinations.
            matches = re.finditer(r'\b(campus[-\s]?groovelab|groovelab|campus)\b', line, re.IGNORECASE)
            for match in matches:
                matched_str = match.group(0)
                
                # Exclude purely technical strings
                is_technical = False
                for tech in ['localStorage', 'sessionStorage', '_active_', '_instrument', '_id', '_token', '_mode', '_dismissed', '_tab', 'import ', 'from ', 'const ', 'let ', 'function ', 'type ', 'interface ', 'groovelab_', 'groovelab-']:
                    if tech in line:
                        if 'className=' in line or 'path:' in line or 'url(' in line:
                            is_technical = True
                            break
                        if line.strip().startswith(('const', 'let', 'import', 'interface', 'type', 'function', 'return sessionStorage', 'return localStorage')):
                            is_technical = True
                            break
                            
                if is_technical:
                    continue
                    
                # If matched string is not exactly "Campus-Groovelab" and is user-visible, it's a violation.
                if matched_str != "Campus-Groovelab":
                    # Check if it's user facing
                    is_user_facing = False
                    if '>' in line and '<' in line:
                        is_user_facing = True
                    elif '"' in line or "'" in line or '`' in line:
                        is_user_facing = True
                        
                    if is_user_facing:
                        # Skip things that are keys in style objects, but include things in user text
                        # e.g., 'campus' as platform mode or value is fine, but in title text it's not.
                        # Let's inspect the line to filter out false positives
                        if re.search(r'\b(activePlatform|platform|mode)\s*===\s*[\'"]campus[\'"]', line):
                            continue
                        if re.search(r'\b(activePlatform|platform|mode)\s*===\s*[\'"]groovelab[\'"]', line):
                            continue
                        # If it's a value inside an array of strings that represents keys, or a state initialization
                        if re.search(r'\[[\'"]campus[\'"],\s*[\'"]groovelab[\'"]\]', line):
                            continue
                        
                        brand_violations.append((idx, matched_str, stripped))
                        
            # 2. COLOR AUDIT
            # Red (#ea4335, #fce8e6) for Admin/Secretariat
            # Green (#137333, #e6f4ea, #d1fae5) for Campus
            if "AdminDashboard" in filename or "SecretaryDashboard" in filename:
                green_hex = re.findall(r'#137333|#e6f4ea|#d1fae5', line, re.IGNORECASE)
                green_class = re.findall(r'\b(bg|text|border|accent|ring)-green-\d+\b', line)
                green_style = re.findall(r'color:\s*[\'"]green[\'"]|background:\s*[\'"]green[\'"]', line)
                if green_hex or green_class or green_style:
                    color_violations.append((idx, f"Green theme color used in Admin/Secretariat: {green_hex or green_class or green_style}", stripped))
                    
            # 3. EMOJI AUDIT
            emojis_found = [c for c in line if is_emoji(c)]
            if emojis_found:
                emoji_violations.append((idx, "".join(emojis_found), stripped))
                
            # 4. AVATAR AUDIT
            # Look for violations of Admin/Secretariat avatar rules.
            # Must show /campus_login_hero.png.
            # Check for non-hero avatars being assigned to admin/secretary
            if "AdminDashboard" in filename or "SecretaryDashboard" in filename:
                # E.g. rendering StudioAvatar without checking role, or showing instrument/musician avatars for secretary/admin.
                # Let's identify the lines containing 'avatar' or '/avatars/' or '/avatar_'
                if any(x in line.lower() for x in ['avatar', '/avatars/']):
                    # Check if the line does NOT check for role, or if it hardcodes a musician/instrument avatar
                    # (we collect all references for manual review in the report)
                    avatar_violations.append((idx, stripped))
            elif "App.tsx" in filename:
                if any(x in line.lower() for x in ['avatar', '/avatars/']):
                    avatar_violations.append((idx, stripped))
                    
        # Write Brand Violations
        md_content.append("### 1. Brand Naming Violations")
        if brand_violations:
            md_content.append("| Line | Violation | Line Snippet |")
            md_content.append("|---|---|---|")
            for idx, val, snippet in brand_violations:
                md_content.append(f"| {idx} | `{val}` | `{snippet}` |")
        else:
            md_content.append("No violations found.")
        md_content.append("")
        
        # Write Color Violations
        md_content.append("### 2. Primary Color Violations")
        if color_violations:
            md_content.append("| Line | Color Found | Line Snippet |")
            md_content.append("|---|---|---|")
            for idx, desc, snippet in color_violations:
                md_content.append(f"| {idx} | {desc} | `{snippet}` |")
        else:
            md_content.append("No violations found.")
        md_content.append("")
        
        # Write Emoji Violations
        md_content.append("### 3. Colored Emoji/Icon Violations")
        if emoji_violations:
            md_content.append("| Line | Emojis | Line Snippet |")
            md_content.append("|---|---|---|")
            # Only list top 30 to keep it readable, but note total
            for idx, emojis, snippet in emoji_violations[:30]:
                md_content.append(f"| {idx} | {emojis} | `{snippet}` |")
            if len(emoji_violations) > 30:
                md_content.append(f"| ... | ... | *And {len(emoji_violations) - 30} more emoji instances* |")
        else:
            md_content.append("No violations found.")
        md_content.append("")
        
        # Write Avatar Violations
        md_content.append("### 4. Avatar System Audit & References")
        if avatar_violations:
            md_content.append("| Line | Line Snippet |")
            md_content.append("|---|---|")
            # Filter and show interesting ones (e.g. role check or musician avatars)
            show_count = 0
            for idx, snippet in avatar_violations:
                # filter to show lines that render avatars
                if 'studioavatar' in snippet.lower() or 'avatar_url' in snippet.lower() or 'photo_url' in snippet.lower() or 'defaultavatar' in snippet.lower():
                    md_content.append(f"| {idx} | `{snippet}` |")
                    show_count += 1
                    if show_count >= 20:
                        md_content.append(f"| ... | *And more avatar references* |")
                        break
        else:
            md_content.append("No violations found.")
        md_content.append("\n---\n")

    with open(OUTPUT_MD, 'w', encoding='utf-8') as out_f:
        out_f.write("\n".join(md_content))
    print(f"Report written to {OUTPUT_MD}")

if __name__ == '__main__':
    audit()

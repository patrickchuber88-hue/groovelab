import json
import re

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# Add Check, Star, Award, Sparkles to the lucide-react import
import_target = "import { Calendar, Play, Coffee, Music, Target, Flame,"
import_replacement = "import { Check, Star, Award, Sparkles, Calendar, Play, Coffee, Music, Target, Flame,"
if import_target in content:
    content = content.replace(import_target, import_replacement)
else:
    # Let's find the lucide-react import
    import_match = re.search(r"import \{(.*?)\} from 'lucide-react';", content)
    if import_match:
        current_imports = import_match.group(1)
        if "Check" not in current_imports:
            new_imports = "Check, Star, Award, Sparkles, " + current_imports
            content = content.replace(import_match.group(0), f"import {{ {new_imports} }} from 'lucide-react';")

with open(filename, "w") as f:
    f.write(content)

print("Imports fixed.")

with open('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/restored_content.txt', 'r', encoding='utf-8') as f:
    text = f.read()

print("File length:", len(text))
print("Contains 'briefing':", 'briefing' in text)
print("Contains 'Tagesplan':", 'Tagesplan' in text)
print("Contains 'Hero':", 'Hero' in text)

# Print a few lines where activeTab === 'briefing' matches
import re
matches = [m.start() for m in re.finditer(r"activeTab\s*===\s*'briefing'", text)]
for idx, m in enumerate(matches):
    print(f"Match {idx} at position {m}:")
    print(text[max(0, m - 100):min(len(text), m + 200)])
    print("-" * 40)

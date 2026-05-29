with open('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/recovered_05c40c8d-1940-4b14-96a0-d18ed64ed6d8_24.txt', 'r', encoding='utf-8') as f:
    text = f.read()

print("Length of recovered file 24:", len(text))
print("First 300 chars:")
print(text[:300])

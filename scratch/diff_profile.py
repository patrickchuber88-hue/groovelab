with open('scratch/original.tsx', 'r') as f:
    orig = f.readlines()

with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    mod = f.readlines()

# Let's locate the profile closing section in the original file
# We search for "Settings Tab" in orig
orig_settings_idx = next(i for i, line in enumerate(orig) if "Settings Tab" in line)
print("=== ORIGINAL PROFILE FOOTER ===")
for i in range(orig_settings_idx - 10, orig_settings_idx + 5):
    print(f"{i+1}: {orig[i]}", end="")

mod_settings_idx = next(i for i, line in enumerate(mod) if "Settings Tab" in line)
print("\n=== MODIFIED PROFILE FOOTER ===")
for i in range(mod_settings_idx - 10, mod_settings_idx + 5):
    print(f"{i+1}: {mod[i]}", end="")

import re

with open('apps/groovelab/src/components/ScheduleBoard.tsx', 'r') as f:
    content = f.read()

# 1. Replace the early return for onboarding overlay
content = content.replace('if (showOnboardingOverlay) {\n    const timeOptions', 'let onboardingOverlayContent = null;\n  if (showOnboardingOverlay) {\n    const timeOptions')
content = content.replace('    return (\n      <div style={{\n        background: \'linear-gradient', '    onboardingOverlayContent = (\n      <div style={{\n        background: \'linear-gradient')

# 2. Extract the Header Panel and reorganize the main return
# Find the start of the `else` block for `activeTab === 'calendar'`
main_else_start = content.find('      ) : (\n        <>\n          {showCelebration ? (')
if main_else_start == -1:
    print("Could not find main else start")
    exit(1)

# Find where the Header Panel starts
header_panel_start = content.find('          {/* Header Panel */}')
if header_panel_start == -1:
    print("Could not find header panel start")
    exit(1)

# Find where the Header Panel ends (it's followed by {/* Draft Management Toolbar */})
draft_toolbar_start = content.find('          {/* Draft Management Toolbar */}')
if draft_toolbar_start == -1:
    print("Could not find draft toolbar start")
    exit(1)

header_panel = content[header_panel_start:draft_toolbar_start]

# We want to reorganize it as:
#       ) : (
#         <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
# [HEADER PANEL]
#           {onboardingOverlayContent ? (
#             onboardingOverlayContent
#           ) : showCelebration ? (
# [CELEBRATION BLOCK]
#           ) : (
#             <>
# [DRAFT TOOLBAR + REST]

# Let's extract Celebration Block
celebration_start = content.find('        <div className="animation-slide-up"', main_else_start)
celebration_end = content.find('          </button>\n        </div>\n      ) : (\n        <div style={{ display: \'grid\', gridTemplateColumns: \'1fr\', gap: \'16px\' }}>\n', celebration_start)
if celebration_end == -1:
    print("Could not find celebration end")
    exit(1)
celebration_end += len('          </button>\n        </div>')
celebration_block = content[celebration_start:celebration_end]

# Remove the old layout from main_else_start to draft_toolbar_start
# And replace with the new structure
old_section = content[main_else_start:draft_toolbar_start]

new_section = f"""      ) : (
        <div style="{{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}">
{header_panel}
          {{onboardingOverlayContent ? (
            onboardingOverlayContent
          ) : showCelebration ? (
{celebration_block}
          ) : (
            <>
"""

content = content[:main_else_start] + new_section + content[draft_toolbar_start:]

# Finally, we need to add the closing tags at the very end of the component return
# The old code had:
#         </div>
#       )}
#     </div>
#   );
# We changed the structure so we need an extra `</>` closing tag. Wait, let's find the end of the return statement.
end_of_return = content.rfind('      )}\n    </div>\n  );\n};')
if end_of_return != -1:
    content = content[:end_of_return] + '            </>\n          )}\n        </div>\n' + content[end_of_return:]
else:
    print("Could not find end of return")

with open('apps/groovelab/src/components/ScheduleBoard.tsx', 'w') as f:
    f.write(content)

print("Script completed")

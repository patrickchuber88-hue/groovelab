with open('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Fix briefing footer: replace ")\n      )}\n      </div>" with ")\n      }\n      </div>"
# Let's search around line 11090-11092
# The exact text is:
# "        )\n      )}\n      </div>\n      \n      <div style={{ display: activeTab === 'hero'"
old_briefing = """        )
      )}
      </div>
      
      <div style={{ display: activeTab === 'hero'"""

new_briefing = """        )
      }
      </div>
      
      <div style={{ display: activeTab === 'hero'"""

if old_briefing in content:
    content = content.replace(old_briefing, new_briefing)
    print("Fixed briefing footer")
else:
    # Try with unix line endings/spaces
    print("Could not find briefing footer exactly, trying regex or alternative spacing")

# 2. Fix songs footer: remove extra closing div
# The structure around 8540:
# "        </div>\n      </div>\n\n      <div style={{ display: activeTab === 'campus_cup'"
old_songs = """        </div>
      </div>

      <div style={{ display: activeTab === 'campus_cup'"""

new_songs = """      </div>

      <div style={{ display: activeTab === 'campus_cup'"""

if old_songs in content:
    content = content.replace(old_songs, new_songs)
    print("Fixed songs footer")
else:
    print("Could not find songs footer exactly")

# 3. Fix campus_cup footer: remove extra closing div
# The structure around 9106:
# "        </div>\n      </div>\n\n      <div style={{ display: activeTab === 'events'"
old_campus_cup = """        </div>
      </div>

      <div style={{ display: activeTab === 'events'"""

new_campus_cup = """      </div>

      <div style={{ display: activeTab === 'events'"""

if old_campus_cup in content:
    content = content.replace(old_campus_cup, new_campus_cup)
    print("Fixed campus_cup footer")
else:
    print("Could not find campus_cup footer exactly")

# 4. Fix settings footer: remove extra closing div
# The structure around 12412:
# "          </div>\n        </div>\n      </div>\n\n      {/* Notebook Lehrwerk Detail Modal */}"
old_settings = """          </div>
        </div>
      </div>

      {/* Notebook Lehrwerk Detail Modal */}"""

new_settings = """          </div>
      </div>

      {/* Notebook Lehrwerk Detail Modal */}"""

if old_settings in content:
    content = content.replace(old_settings, new_settings)
    print("Fixed settings footer")
else:
    print("Could not find settings footer exactly")

with open('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'w') as f:
    f.write(content)

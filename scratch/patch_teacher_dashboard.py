import re

with open("apps/groovelab/src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

# 1. Add imports
import_statement = "import { usePremiumOnboardingTour, TourStartButton, TourStep } from './PremiumOnboardingTour';\n"
if "usePremiumOnboardingTour" not in content:
    content = content.replace("import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';", "import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';\n" + import_statement)
    content = content.replace("import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';", "import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';\n" + import_statement)

# 2. Add IDs for Briefing
# KPIs
content = content.replace(
    "<div style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>",
    "<div id=\"tour-teacher-kpis\" style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>"
)

# Briefing Banner (Avatar + Hey)
content = content.replace(
    "{/* LEFT COLUMN: Greeting Banner & Schüler Notizen */}\n                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: (isWeekend || isFreeDay) ? '1 1 100%' : '1 1 350px', minWidth: '300px' }}>",
    "{/* LEFT COLUMN: Greeting Banner & Schüler Notizen */}\n                    <div id=\"tour-teacher-briefing\" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: (isWeekend || isFreeDay) ? '1 1 100%' : '1 1 350px', minWidth: '300px' }}>"
)

# Briefing Daily Schedule
content = content.replace(
    "{/* RIGHT COLUMN: Interactive Board */}\n                    {(!isWeekend && !isFreeDay) && (\n                      <div style={{",
    "{/* RIGHT COLUMN: Interactive Board */}\n                    {(!isWeekend && !isFreeDay) && (\n                      <div id=\"tour-teacher-schedule\" style={{"
)

# 3. Add IDs for Live Lab
content = content.replace(
    "        <div className={`live-lab-grid ${isSidebarCollapsed ? 'collapsed' : ''}`}>",
    "        <div id=\"tour-teacher-livelab\" className={`live-lab-grid ${isSidebarCollapsed ? 'collapsed' : ''}`}>"
)

# Live Lab Room Tabs
content = content.replace(
    "              {activeTab === 'live' && (\n                <div className=\"room-tabs\">",
    "              {activeTab === 'live' && (\n                <div id=\"tour-teacher-livelab-rooms\" className=\"room-tabs\">"
)

# Bands / Students
content = content.replace(
    "        ) : activeTab === 'bands' ? (",
    "        ) : activeTab === 'bands' ? (\n          <div id=\"tour-teacher-bands\">"
)
content = content.replace(
    "          </div>\n        ) : activeTab === 'students' ?",
    "          </div>\n          </div>\n        ) : activeTab === 'students' ?"
)

# 4. Insert usePremiumOnboardingTour in TeacherDashboard
# Wait, let's just write this to file and test it
with open("apps/groovelab/src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

print("IDs added")

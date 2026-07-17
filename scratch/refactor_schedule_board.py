import os

file_path = "apps/groovelab/src/components/ScheduleBoard.tsx"

with open(file_path, 'r') as f:
    content = f.read()

# 1. Imports
import_str = "import { usePremiumOnboardingTour, TourStartButton, TourStep } from './PremiumOnboardingTour';\n"
if "usePremiumOnboardingTour" not in content:
    content = content.replace("import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';", "import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';\n" + import_str)

# 2. Find and replace state declarations
state_to_remove = """  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 999999
  });"""
content = content.replace(state_to_remove, "")

# 3. Find and remove useEffect block
use_effect_start = content.find("  useEffect(() => {\n    if (!isTourActive) return;")
if use_effect_start != -1:
    use_effect_end = content.find("  }, [currentTourStep, isTourActive, tourSteps]);", use_effect_start)
    if use_effect_end != -1:
        content = content[:use_effect_start] + content[use_effect_end + len("  }, [currentTourStep, isTourActive, tourSteps]);") + 1:]

# 4. Remove old auto-start logic
auto_start_logic = """  useEffect(() => {
    if (selectedTeacherId && hasSubmittedSchedule === false) {
      const isCompleted = localStorage.getItem(`campus_groovelab_tour_completed_${selectedTeacherId}`);
      if (!isCompleted) {
        const timer = setTimeout(() => {
          setIsTourActive(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedTeacherId, hasSubmittedSchedule]);"""
content = content.replace(auto_start_logic, "")

# 5. Insert hook
hook_str = """  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_groovelab_tour_completed_${selectedTeacherId}`,
    steps: tourSteps,
    platformTheme: localStorage.getItem('groovelab_active_platform') === 'campus' ? 'campus' : 'groovelab'
  });"""

content = content.replace("  // --- Data Loading ---", hook_str + "\n\n  // --- Data Loading ---")

# 6. Replace the old inline UI
# We need to find {isTourActive && ( to the end of the file.
inline_ui_start = content.find("{/* Guided Tour Backdrop Overlay */}")
if inline_ui_start == -1:
    # try another way
    inline_ui_start = content.find("      {/* Guided Tour Backdrop Overlay */}")

if inline_ui_start != -1:
    inline_ui_end = content.find("        );", inline_ui_start)
    inline_ui_end2 = content.find("      })()}", inline_ui_end)
    if inline_ui_end2 != -1:
        content = content[:inline_ui_start] + "      <TourComponent />\n" + content[inline_ui_end2 + len("      })()}"):]
        
# 7. Replace old info button
old_info_btn_start = content.find("<button\n                      onClick={() => {")
if old_info_btn_start != -1:
    # It might be in the segmented switch
    # Let's search for "tour starten"
    old_info_btn = content.find("title=\"Tour starten\"")
    # Actually let's just do a string replace on the old button if possible.
    
# Let's just do it securely by writing out the file and we can manually fix if needed
with open(file_path, 'w') as f:
    f.write(content)

print("Refactored ScheduleBoard.tsx partially. Let's check remaining.")

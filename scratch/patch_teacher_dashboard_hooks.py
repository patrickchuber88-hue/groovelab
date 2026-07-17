import re

with open("apps/groovelab/src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

# 1. Insert the tourSteps and hook
hook_code = """
  // --- Guided Tour ---
  const tourSteps = useMemo<TourStep[]>(() => {
    switch(activeTab) {
      case 'briefing':
        return [
          { title: "Dein Briefing \U0001f44b", description: "Hier findest du eine Übersicht über deinen Tag und alle wichtigen Kennzahlen.", selector: "tour-teacher-briefing" },
          { title: "Kennzahlen \U0001f4ca", description: "Diese Karten zeigen dir auf einen Blick, wie viele Schüler du heute hast und wie lange deine durchschnittliche Übe-Streak ist.", selector: "tour-teacher-kpis" },
          { title: "Dein Tagesplan \U0001f4c5", description: "Hier siehst du deine anstehenden Unterrichtstermine für heute.", selector: "tour-teacher-schedule" }
        ];
      case 'live':
        return [
          { title: "Das Live Lab \U0001f3b8", description: "Hier hast du die volle Kontrolle über den Live-Unterricht und die Raumbelegung.", selector: "tour-teacher-livelab" },
          { title: "Räume verwalten \U0001f6aa", description: "Wähle hier einen Raum aus, um die interaktive Sitzverteilung und die angemeldeten Schüler zu sehen.", selector: "tour-teacher-livelab-rooms" }
        ];
      case 'bands':
        return [
          { title: "Band-Verwaltung \U0001f3a4", description: "Hier kannst du neue Bands gründen, Mitglieder verwalten und euren Fortschritt verfolgen.", selector: "tour-teacher-bands" }
        ];
      default:
        return [];
    }
  }, [activeTab]);

  const activePlatform = typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') || 'groovelab' : 'groovelab';

  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_groovelab_tour_completed_${activeTab}_${userId}`,
    steps: tourSteps,
    platformTheme: activePlatform === 'campus' ? 'campus' : 'groovelab'
  });
"""

# Let's find a good place to insert this hook, maybe after `const [activeTab, setActiveTab] = useState`
# But activeTab is passed as prop or state?
# "export function TeacherDashboard({ "
# Let's search for "const [activeTab, setActiveTab] = useState<string>(" or "const [activeTab, setActiveTab] = useState"
if "const [activeTab, setActiveTab] = useState" in content:
    content = content.replace("const [activeTab, setActiveTab] = useState", hook_code + "\n  const [activeTab, setActiveTab] = useState")
else:
    # Just put it after `const [isSidebarCollapsed, setIsSidebarCollapsed] = useState`
    content = content.replace("const [isSidebarCollapsed, setIsSidebarCollapsed] = useState", hook_code + "\n  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState")

# 2. Insert TourComponent at the very end of the return statement
# We need to find the end of the return statement of TeacherDashboard.
# TeacherDashboard ends with:
#       <UserEditModal ... />
#     </div>
#   );
# }

content = content.replace(
    "    </div>\n  );\n}",
    "      <TourComponent />\n    </div>\n  );\n}"
)

# 3. Add the TourStartButton in the header
# We want to add it to the header where the tab title is.
# Let's search for:
#       {/* HEADER */}
#       {!hideHeader && (
#         <header style={{ ... }}>
#           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

search_str = "<header style={{ marginBottom: activeTab === 'live' ? '16px' : '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>"
replace_str = search_str + """
          <div style={{ position: 'absolute', right: '32px', top: '32px' }}>
            <TourStartButton onClick={startTour} platformTheme={activePlatform === 'campus' ? 'campus' : 'groovelab'} />
          </div>
"""
content = content.replace(search_str, replace_str)

with open("apps/groovelab/src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

print("Hooks added")

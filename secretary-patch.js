const fs = require('fs');
let content = fs.readFileSync('apps/groovelab/src/components/SecretaryDashboard.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import { TeacherDashboard } from './TeacherDashboard';",
  "import { usePremiumOnboardingTour, TourStartButton, TourStep } from './PremiumOnboardingTour';\nimport { TeacherDashboard } from './TeacherDashboard';"
);

// 2. Add hook at top of SecretaryDashboard
const hookCode = `  const tourSteps: TourStep[] = useMemo(() => {
    return [
      {
        selector: '#tour-secretary-briefing',
        title: 'Willkommen in der Verwaltung',
        content: 'Dies ist die zentrale Übersicht für das Sekretariat. Hier laufen alle wichtigen Informationen aus dem Campus zusammen.',
        position: 'right',
        platformTheme: 'campus'
      },
      {
        selector: '#tour-secretary-kpis',
        title: 'Tägliche KPIs',
        content: 'Auf einen Blick siehst du die aktuelle Raumauslastung, wie viele Schüler ihre Accounts aktiviert haben, ob es Terminkonflikte gibt und wie viele Lehrkräfte sich krankgemeldet haben.',
        position: 'bottom',
        platformTheme: 'campus'
      },
      {
        selector: '#tour-secretary-bookings',
        title: 'Raumbuchungen Bestätigen',
        content: 'Lehrkräfte können vorläufige Raumbuchungen vornehmen. Diese landen hier in deiner Warteschlange (Queue) zur finalen Prüfung und Freigabe durch die Verwaltung.',
        position: 'left',
        platformTheme: 'campus'
      }
    ];
  }, []);

  const { TourComponent, startTour, isTourRunning } = usePremiumOnboardingTour('secretary', tourSteps, true);

`;

content = content.replace(
  "  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();",
  "  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();\n\n" + hookCode
);

// 3. Add ID to Greeting Header
content = content.replace(
  "                    {/* GLASS DASHBOARD GREETING HEADER */}\n                    <div style={{",
  "                    {/* GLASS DASHBOARD GREETING HEADER */}\n                    <div id=\"tour-secretary-briefing\" style={{"
);

// 4. Add ID to KPIs
content = content.replace(
  "                  {/* 4 GAMIFIED CARD METRICS ROW (KPIs) */}\n                  <div style={{ display: 'grid'",
  "                  {/* 4 GAMIFIED CARD METRICS ROW (KPIs) */}\n                  <div id=\"tour-secretary-kpis\" style={{ display: 'grid'"
);

// 5. Add ID to Bookings (WIDGET: Vorläufige Raumbuchungen)
content = content.replace(
  "                  {/* WIDGET: Vorläufige Raumbuchungen */}\n                  <div style={{",
  "                  {/* WIDGET: Vorläufige Raumbuchungen */}\n                  <div id=\"tour-secretary-bookings\" style={{"
);

// 6. Add TourStartButton to Header
content = content.replace(
  "          <div style={{ paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>",
  "          <div style={{ paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>\n            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>"
);

content = content.replace(
  "            {activeTab === 'secretary' ? 'Verwaltung' : activeTab === 'campus' ? 'Campus' : 'GrooveLab'}\n          </div>\n        </div>",
  "            {activeTab === 'secretary' ? 'Verwaltung' : activeTab === 'campus' ? 'Campus' : 'GrooveLab'}\n          </div>\n            </div>\n            {activeTab === 'secretary' && secretarySubTab === 'briefing' && (\n              <TourStartButton \n                onClick={startTour}\n                isTourRunning={isTourRunning}\n                theme=\"campus\"\n              />\n            )}\n        </div>"
);

// 7. Inject TourComponent into main return body at the end
// Let's find the closing tag of SecretaryDashboard. It ends with:
//         </>
//       )}
//     </div>
//   );
// }
// So we insert it right before the last closing div.

content = content.replace(
  "    </div>\n  );\n}",
  "      <TourComponent />\n    </div>\n  );\n}"
);

fs.writeFileSync('apps/groovelab/src/components/SecretaryDashboard.tsx', content);
console.log('Patch applied successfully.');

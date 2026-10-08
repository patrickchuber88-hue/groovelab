# 🏛️ Exemplar 1: Sub-Monolith Mounting & 15-LOC Wiring Buffer
<!--
Bounded Context: Campus Architecture / Monolith Ceiling Standard
Rule: Host shell retains historical logic; new feature mounted as autonomous satellite with <= 15 LOC wiring buffer.
-->

### Problemstellung
Eine neue didaktische Übersicht (z. B. `StudentPracticeChronikSatellite.tsx`) soll in das bestehende `StudentPracticeTab.tsx` integriert werden, ohne den bestehenden Monolithen aufzublähen.

### Konforme 0,1% Goldstandard Implementierung

```tsx
// apps/groovelab/src/components/student/StudentPracticeChronikSatellite.tsx
import React from 'react';
import { Calendar, Shield } from 'lucide-react';

interface StudentPracticeChronikSatelliteProps {
  schoolId: string;
  studentId: string;
  fokusLogs: Array<{ id: string; duration_minutes: number; session_date: string }>;
  onShieldRedeemed?: () => void;
}

export const StudentPracticeChronikSatellite: React.FC<StudentPracticeChronikSatelliteProps> = ({
  schoolId,
  studentId,
  fokusLogs,
  onShieldRedeemed
}) => {
  return (
    <section 
      aria-label="Monats-Chronik & Übe-Schutzschilde"
      className="mt-6 rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Monats-Chronik</h3>
            <p className="text-xs text-slate-500">Übeeinheiten und aktive Schutzschilde</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          <span>3 Schilde aktiv</span>
        </div>
      </div>
      <div className="pt-4 grid grid-cols-7 gap-2 text-center">
        {fokusLogs.slice(0, 7).map((log) => (
          <div key={log.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="block text-xs font-bold text-slate-700">{log.duration_minutes}m</span>
          </div>
        ))}
      </div>
    </section>
  );
};
```

```tsx
// In apps/groovelab/src/components/StudentPracticeTab.tsx (Host Shell Diff)
// Diff: Genau 8 Zeilen technischer Verdrahtungs-Code (strikte Einhaltung des 15-Zeilen-Limits)
+import { StudentPracticeChronikSatellite } from './student/StudentPracticeChronikSatellite';

 // ... Bestehende Host-Logik bleibt unangetastet ...
 
+<StudentPracticeChronikSatellite
+  schoolId={activeSchoolId}
+  studentId={activeStudentId}
+  fokusLogs={studentBriefingData.fokusLogs}
+  onShieldRedeemed={handleShieldUpdate}
+/>
```

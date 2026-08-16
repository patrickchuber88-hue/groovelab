## 2026-08-16T15:28:22Z
You are the SECURITY & PRIVACY AUDITOR for the comprehensive quality, UX, pedagogical, hardware, and security audit of the newly implemented 3-Level Adaptive UI System in the Campus Student Dashboard of Campus-Groovelab.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_auditor_security_privacy
Workspace root: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
App directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab
Original Request: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/ORIGINAL_REQUEST.md

Your Task:
Perform a forensic hardware safety, data privacy, and child protection (GDPR/COPPA) audit on the 3-Level Adaptive UI System and audio/microphone components.

Specific Focus Areas:
1. Hardware Safety (Microphone & MediaStream Management):
   - Inspect `SimpleVoiceRecorder.tsx` and all audio recording / loopstation hooks and components in `apps/groovelab/src/`.
   - Verify that when a recording stops, when the modal closes, or when the component unmounts, ALL audio tracks are physically and irrevocably terminated: `stream.getTracks().forEach(t => t.stop())`.
   - Verify there are no lingering microphone permissions, active streams, or background recording processes.
2. Data Minimization & Child Protection (GDPR/COPPA):
   - Verify student name anonymization ("Vorname + Anfangsbuchstabe Nachname", e.g. "Max M." in teacher view; generic greeting "Mein Hausaufgabenheft" / "Hausaufgabenheft" without child surname in student view).
   - Verify that no SEPA, payment, contract, or unencrypted email/phone data of minors is stored in localStorage or sent in telemetry.
   - Verify audio recording data handling: ensure large base64 strings are not dumped into plain text columns, and storage references are properly scoped.
3. Read-Only Audit Execution:
   - Confirm that this audit operates 100% read-only with zero database mutations.

const fs = require('fs');
const path = require('path');

const filePath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/SecretaryDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// We will target the lines between activeTab === 'groovelab' && ( and the end of the kiosk section
const startIndex = content.indexOf("{activeTab === 'groovelab' && (");
const endIndex = content.indexOf("        {/* TAB 1.7: SECRETARY - LICENSES */}");

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start/end marks in the file!");
  process.exit(1);
}

let targetBlock = content.substring(startIndex, endIndex);

// Replace dark colors with light ones
targetBlock = targetBlock
  .replaceAll("background: '#18181b'", "background: '#ffffff'")
  .replaceAll("background: '#09090b'", "background: '#f8fafc'")
  .replaceAll("background: '#27272a'", "background: '#f1f5f9'")
  .replaceAll("border: '1px solid #27272a'", "border: '1px solid #e2e8f0'")
  .replaceAll("border: '1.5px solid #27272a'", "border: '1.5px solid #dadce0'")
  .replaceAll("border: '2px solid #27272a'", "border: '2px solid #dadce0'")
  .replaceAll("border: `1.5px solid ${isOccupied ? (isTeacher ? '#22c55e' : '#fbbc05') : '#27272a'}`", "border: `1.5px solid ${isOccupied ? (isTeacher ? '#22c55e' : '#fbbc05') : '#dadce0'}`")
  .replaceAll("border: '2px solid #09090b'", "border: '2px solid #e2e8f0'")
  .replaceAll("border: '1px solid #3f3f46'", "border: '1px solid #cbd5e1'")
  .replaceAll("borderTop: '1px solid #27272a'", "borderTop: '1px solid #e2e8f0'")
  .replaceAll("borderBottom: '1px solid #27272a'", "borderBottom: '1px solid #e2e8f0'")
  .replaceAll("borderLeft: '1px solid #27272a'", "borderLeft: '1px solid #e2e8f0'")
  .replaceAll("color: '#ffffff'", "color: '#1e293b'")
  .replaceAll("color: '#f4f4f5'", "color: '#1e293b'")
  .replaceAll("color: '#a1a1aa'", "color: '#64748b'")
  .replaceAll("background: '#27272a'", "background: '#f8fafc'")
  .replaceAll("border: '1px solid #3f3f46'", "border: '1px solid #dadce0'")
  .replaceAll("color: '#a1a1aa'", "color: '#64748b'")
  .replaceAll("style={{ background: '#fbbc05', color: '#09090b', fontWeight: 900 }}", "className=\"google-btn-primary\" style={{ background: '#eab308', color: '#ffffff' }}")
  .replaceAll("color: '#fbbc05'", "color: '#b45309'")
  .replaceAll("color: '#ffffff'", "color: '#1e293b'")
  .replaceAll("color: '#ea4335'", "color: '#ea4335'") // keep red delete icons red
  .replaceAll("color: '#22c55e'", "color: '#137333'") // keep green success icons green
  .replaceAll("background: '#22c55e'", "background: '#34a853'")
  .replaceAll("background: '#ef4444'", "background: '#ea4335'")
  .replaceAll("borderLeft: '4px solid #ef4444'", "borderLeft: '4px solid #ea4335'")
  .replaceAll("border: '1px solid #27272a'", "border: '1px solid #e2e8f0'")
  .replaceAll("background: '#09090b'", "background: '#f8fafc'")
  .replaceAll("background: '#27272a'", "background: '#f8fafc'")
  .replaceAll("border: '1px solid #3f3f46'", "border: '1px solid #dadce0'")
  .replaceAll("color: '#ffffff'", "color: '#1e293b'")
  .replaceAll("color: '#a1a1aa'", "color: '#64748b'");

// Re-integrate the modified block
content = content.substring(0, startIndex) + targetBlock + content.substring(endIndex);

// Also replace the remaining GrooveLab slideover background rules (lines around 4165-4200)
content = content
  .replace("background: activeTab === 'groovelab' ? '#18181b' : '#ffffff'", "background: '#ffffff'")
  .replace("color: activeTab === 'groovelab' ? '#f4f4f5' : '#0f172a'", "color: '#0f172a'")
  .replace("borderLeft: activeTab === 'groovelab' ? '1px solid #27272a' : '1px solid #e2e8f0'", "borderLeft: '1px solid #e2e8f0'")
  .replace("borderBottom: activeTab === 'groovelab' ? '1px solid #27272a' : '1px solid #e2e8f0'", "borderBottom: '1px solid #e2e8f0'")
  .replace("color: activeTab === 'groovelab' ? '#a1a1aa' : '#64748b'", "color: '#64748b'")
  .replace("background = activeTab === 'groovelab' ? '#27272a' : '#f1f5f9'", "background = '#f1f5f9'")
  .replace("border: activeTab === 'groovelab' ? '1px solid #27272a' : '1px solid #dadce0'", "border: '1px solid #dadce0'")
  .replace("background: activeTab === 'groovelab' ? '#09090b' : '#ffffff'", "background: '#ffffff'")
  .replace("background: activeTab === 'groovelab' ? '#27272a' : '#f8fafc'", "background: '#f8fafc'")
  .replace("border: activeTab === 'groovelab' ? '1px solid #3f3f46' : '1px solid #f1f5f9'", "border: '1px solid #f1f5f9'")
  .replace("background: activeTab === 'groovelab' ? 'rgba(239, 68, 68, 0.05)' : '#fef2f2'", "background: '#fef2f2'")
  .replace("borderTop: activeTab === 'groovelab' ? '1px solid #27272a' : '1px solid #e2e8f0'", "borderTop: '1px solid #e2e8f0'")
  .replace("background: activeTab === 'groovelab' ? '#09090b' : '#f8fafc'", "background: '#f8fafc'");

fs.writeFileSync(filePath, content, 'utf8');
console.log("GrooveLab workspace successfully changed to bright theme!");

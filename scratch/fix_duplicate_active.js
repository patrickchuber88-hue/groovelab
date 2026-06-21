const fs = require('fs');
const file = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/SecretaryDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                                            {billingPayer === 'school' && studentBillingOption === 'option2' && activeStudents > 0 && (
                                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#4f46e5', marginTop: '2px' }}>
                                                <span>Schüler-Aktivierung ({activeStudents} aktiv):</span>
                                                <strong style={{ fontWeight: 800 }}>{(activeStudents * 0.49).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                              </div>
                                            )}`;

if (content.includes(target)) {
  content = content.replace(target, '');
  console.log('Successfully removed duplicate Schüler-Aktivierung display.');
} else {
  // Try CRLF
  const targetCRLF = target.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, '');
    console.log('Successfully removed duplicate Schüler-Aktivierung display (CRLF).');
  } else {
    console.log('Target block not found!');
  }
}

fs.writeFileSync(file, content, 'utf8');

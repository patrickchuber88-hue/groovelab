const fs = require('fs');
const file = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/SecretaryDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Zahlungsabgleich button from sub-tab bar
const targetButton1 = `<button
                                    onClick={() => setActiveBillingSubTab('matching')}
                                    style={{
                                      background: activeBillingSubTab === 'matching' ? '#ffffff' : 'transparent',
                                      border: 'none',
                                      borderRadius: '10px',
                                      padding: '8px 20px',
                                      fontSize: '0.78rem',
                                      fontWeight: activeBillingSubTab === 'matching' ? 800 : 600,
                                      color: activeBillingSubTab === 'matching' ? '#1e293b' : '#64748b',
                                      cursor: 'pointer',
                                      boxShadow: activeBillingSubTab === 'matching' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    💵 Zahlungsabgleich
                                  </button>`;

const targetButton2 = `{billingPayer === 'student' && (
                                    <button
                                      onClick={() => setActiveBillingSubTab('matching')}
                                      style={{
                                        background: activeBillingSubTab === 'matching' ? '#ffffff' : 'transparent',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '8px 20px',
                                        fontSize: '0.78rem',
                                        fontWeight: activeBillingSubTab === 'matching' ? 800 : 600,
                                        color: activeBillingSubTab === 'matching' ? '#1e293b' : '#64748b',
                                        cursor: 'pointer',
                                        boxShadow: activeBillingSubTab === 'matching' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      💵 Zahlungsabgleich
                                    </button>
                                  )}`;

if (content.includes(targetButton1)) {
  content = content.replace(targetButton1, '');
  console.log('Zahlungsabgleich tab button removed (style 1).');
} else if (content.includes(targetButton2)) {
  content = content.replace(targetButton2, '');
  console.log('Zahlungsabgleich tab button removed (style 2).');
} else {
  // Try CRLF
  const targetButton1CRLF = targetButton1.replace(/\n/g, '\r\n');
  const targetButton2CRLF = targetButton2.replace(/\n/g, '\r\n');
  if (content.includes(targetButton1CRLF)) {
    content = content.replace(targetButton1CRLF, '');
    console.log('Zahlungsabgleich tab button removed (style 1 CRLF).');
  } else if (content.includes(targetButton2CRLF)) {
    content = content.replace(targetButton2CRLF, '');
    console.log('Zahlungsabgleich tab button removed (style 2 CRLF).');
  } else {
    console.log('Zahlungsabgleich tab button not found in file!');
  }
}

// 2. Refactor the simulation fallback loop in SecretaryDashboard.tsx to calculate monthly student fee instead of annual restmonate
// Let's find: const studentFee = 0.40 * restmonate;
const targetStudentFee = `                                  const restmonate = monthsMapLocal[m] !== undefined ? monthsMapLocal[m] : 12;
                                  const studentFee = 0.40 * restmonate;
                                  const aktAmount = monthActivationsCount * studentFee;`;

const replacementStudentFee = `                                  const restmonate = monthsMapLocal[m] !== undefined ? monthsMapLocal[m] : 12;
                                  // Billed monthly instead of annual flat rate
                                  const studentFee = studentBillingOption === 'option2' ? 0.40 : 0.49;
                                  const aktAmount = monthActivationsCount * studentFee;`;

if (content.includes(targetStudentFee)) {
  content = content.replace(targetStudentFee, replacementStudentFee);
  console.log('Simulation student fee set to monthly.');
} else {
  const targetStudentFeeCRLF = targetStudentFee.replace(/\n/g, '\r\n');
  if (content.includes(targetStudentFeeCRLF)) {
    content = content.replace(targetStudentFeeCRLF, replacementStudentFee.replace(/\n/g, '\r\n'));
    console.log('Simulation student fee set to monthly (CRLF).');
  } else {
    console.log('Simulation student fee block not found!');
  }
}

// 3. Update the text labels in the mapping output to match the clean professional wording
const targetHistoryLabels = `                                                  <span style={{ fontSize: '0.65rem', color: inv.type === 'INF' ? '#0369a1' : '#6b21a8', display: 'block', fontWeight: 700 }}>
                                                    {inv.type === 'INF' ? '💳 Infrastruktur-Rechnung' : '👥 Sammelrechnung Schüleraktivierungen'}
                                                  </span>
                                                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>
                                                    Erstellt: {formatDateGerman(inv.billing_date)}
                                                  </span>
                                                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                                                    Fällig am: {formatDateGerman(inv.due_date)}
                                                  </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '0.74rem' }}>
                                                  <div style={{ color: isCancelled ? '#64748b' : (inv.type === 'INF' ? '#0369a1' : '#16a34a'), fontWeight: 800 }}>
                                                    Betrag: {Number(inv.amount || 0).toFixed(2).replace('.', ',')} €
                                                  </div>
                                                  {inv.type === 'AKT' && !isCancelled && (
                                                    <div style={{ fontSize: '0.58rem', color: '#16a34a', background: '#d1fae5', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                                                      Durchlaufender Posten
                                                    </div>
                                                  )}`;

const replacementHistoryLabels = `                                                  <span style={{ fontSize: '0.65rem', color: inv.type === 'INF' ? '#0369a1' : '#6b21a8', display: 'block', fontWeight: 700 }}>
                                                    {inv.type === 'INF' ? '💳 Service- & Plattformgebühren' : '👥 Direktabrechnung Schülerlizenzen'}
                                                  </span>
                                                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>
                                                    Rechnungsdatum: {formatDateGerman(inv.billing_date)}
                                                  </span>
                                                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                                                    Zahlbar bis: {formatDateGerman(inv.due_date)}
                                                  </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '0.74rem' }}>
                                                  <div style={{ color: isCancelled ? '#64748b' : (inv.type === 'INF' ? '#0369a1' : '#16a34a'), fontWeight: 800 }}>
                                                    Betrag: {Number(inv.amount || 0).toFixed(2).replace('.', ',')} €
                                                  </div>
                                                  {inv.type === 'AKT' && !isCancelled && (
                                                    <div style={{ fontSize: '0.58rem', color: '#16a34a', background: '#d1fae5', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                                                      Direktabrechnung (keine Kosten für Schule)
                                                    </div>
                                                  )}`;

if (content.includes(targetHistoryLabels)) {
  content = content.replace(targetHistoryLabels, replacementHistoryLabels);
  console.log('Wording labels updated successfully.');
} else {
  const targetHistoryLabelsCRLF = targetHistoryLabels.replace(/\n/g, '\r\n');
  if (content.includes(targetHistoryLabelsCRLF)) {
    content = content.replace(targetHistoryLabelsCRLF, replacementHistoryLabels.replace(/\n/g, '\r\n'));
    console.log('Wording labels updated successfully (CRLF).');
  } else {
    console.log('Wording labels target not found!');
  }
}

fs.writeFileSync(file, content, 'utf8');

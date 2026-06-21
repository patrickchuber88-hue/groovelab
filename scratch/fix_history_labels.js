const fs = require('fs');
const file = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/SecretaryDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Step 1: Hide "Zahlungsabgleich" button when billingPayer === 'school'
const targetButton = `                                  <button
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

const replacementButton = `                                  {billingPayer === 'student' && (
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

if (content.includes(targetButton)) {
  content = content.replace(targetButton, replacementButton);
  console.log('Zahlungsabgleich button hidden for school payer.');
} else {
  // Try with CRLF
  const targetButtonCRLF = targetButton.replace(/\n/g, '\r\n');
  if (content.includes(targetButtonCRLF)) {
    content = content.replace(targetButtonCRLF, replacementButton.replace(/\n/g, '\r\n'));
    console.log('Zahlungsabgleich button hidden for school payer (CRLF).');
  } else {
    console.log('Zahlungsabgleich button target not found!');
  }
}

// Step 2: Refactor invoice history labels to sound premium and client-friendly (less programmer-speak)
const targetLabels = `                                                  <span style={{ fontSize: '0.65rem', color: inv.type === 'INF' ? '#0369a1' : '#6b21a8', display: 'block', fontWeight: 700 }}>
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

const replacementLabels = `                                                  <span style={{ fontSize: '0.65rem', color: inv.type === 'INF' ? '#0369a1' : '#6b21a8', display: 'block', fontWeight: 700 }}>
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

if (content.includes(targetLabels)) {
  content = content.replace(targetLabels, replacementLabels);
  console.log('Invoice list labels updated.');
} else {
  const targetLabelsCRLF = targetLabels.replace(/\n/g, '\r\n');
  if (content.includes(targetLabelsCRLF)) {
    content = content.replace(targetLabelsCRLF, replacementLabels.replace(/\n/g, '\r\n'));
    console.log('Invoice list labels updated (CRLF).');
  } else {
    console.log('Invoice list labels target not found!');
  }
}

fs.writeFileSync(file, content, 'utf8');

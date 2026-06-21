const fs = require('fs');
const file = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/SecretaryDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `          } else if (schoolData.created_at) {
            setContractStartDate(schoolData.created_at);
            setTempSimulatedDate(schoolData.created_at.split('T')[0]);
            localStorage.setItem('contractStartDate', schoolData.created_at);
          }
        }`;

const replacementStr = `          } else if (schoolData.created_at) {
            setContractStartDate(schoolData.created_at);
            setTempSimulatedDate(schoolData.created_at.split('T')[0]);
            localStorage.setItem('contractStartDate', schoolData.created_at);
          }
        }

        // Fetch school invoices from DB
        try {
          const { data: invoicesData, error: invoicesErr } = await supabase
            .from('invoices')
            .select('*')
            .eq('school_id', schoolId)
            .order('billing_date', { ascending: false });

          if (!invoicesErr && invoicesData) {
            setInvoices(invoicesData);
          } else {
            setInvoices([]);
          }
        } catch (invErr) {
          console.error("Error fetching school invoices:", invErr);
        }`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  console.log('Invoices fetch block injected.');
} else {
  // Try CRLF
  const targetStrCRLF = targetStr.replace(/\n/g, '\r\n');
  if (content.includes(targetStrCRLF)) {
    content = content.replace(targetStrCRLF, replacementStr.replace(/\n/g, '\r\n'));
    console.log('Invoices fetch block injected (CRLF).');
  } else {
    console.log('Target string not found!');
  }
}

fs.writeFileSync(file, content, 'utf8');

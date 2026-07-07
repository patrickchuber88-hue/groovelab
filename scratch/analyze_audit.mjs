import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/audit_results.json', 'utf-8'));

console.log("=== RLS DISABLED TABLES ===");
const disabled = data.rls.filter(t => !t.rls_enabled);
console.log(`Found ${disabled.length} tables with RLS disabled:`);
disabled.forEach(t => console.log(`- ${t.table_name}`));

console.log("\n=== POLICIES PER TABLE ===");
const policyMap = {};
data.policies.forEach(p => {
  if (!policyMap[p.tablename]) policyMap[p.tablename] = [];
  policyMap[p.tablename].push(p);
});

Object.keys(policyMap).forEach(table => {
  console.log(`\nTable: ${table} (${policyMap[table].length} policies)`);
  policyMap[table].forEach(p => {
    console.log(`  * [${p.cmd}] ${p.policyname} (roles: ${JSON.stringify(p.roles)})`);
    if (p.qual) console.log(`    QUAL: ${p.qual.replace(/\n/g, ' ')}`);
    if (p.with_check) console.log(`    WITH CHECK: ${p.with_check.replace(/\n/g, ' ')}`);
  });
});

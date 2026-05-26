const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

// Combine migrations 53 to 58
const migrationFiles = [
  '53_add_teacher_id_to_users.sql',
  '54_secretary_portal_setup.sql',
  '55_usp_extensions.sql',
  '56_schedule_engine_matrix.sql',
  '57_billing_and_quota_adjustments.sql',
  '58_schedule_status_upgrades.sql'
];

let combinedSql = '';
for (const file of migrationFiles) {
  const filePath = path.join(__dirname, '..', 'supabase', 'migrations', file);
  console.log(`Reading migration: ${file}`);
  combinedSql += `-- --- START OF MIGRATION: ${file} ---\n`;
  combinedSql += fs.readFileSync(filePath, 'utf8') + '\n';
}

combinedSql += `
-- Force schema reload for PostgREST
NOTIFY pgrst, 'reload schema';
`;

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  // We will execute psql and stream the migration SQL into stdin
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`Migration finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    // Write migration SQL to stdin and close stdin
    stream.write(combinedSql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);

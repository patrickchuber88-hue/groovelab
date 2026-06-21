const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const conn = new Client();

const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code, signal) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
      }).stderr.on('data', (data) => {
        stderr += data.toString();
      });
    });
  });
};

conn.on('ready', async () => {
  console.log('SSH connection established.');
  try {
    console.log('--- 1. Disk Space (df -h) ---');
    const dfRes = await runCommand('df -h');
    console.log(dfRes.stdout);

    console.log('--- 2. Docker Storage (docker system df) ---');
    const dockerDf = await runCommand('docker system df');
    console.log(dockerDf.stdout);

    console.log('--- 3. Postgres Container Mounts ---');
    const containerInspect = await runCommand('docker inspect supabase-db --format="{{json .Mounts}}"');
    console.log(JSON.stringify(JSON.parse(containerInspect.stdout), null, 2));

    console.log('--- 4. Postgres Data Directory Size ---');
    const duDb = await runCommand('docker exec supabase-db du -sh /var/lib/postgresql/data 2>/dev/null || docker exec supabase-db du -sh /var/lib/postgresql/data/pgdata 2>/dev/null');
    console.log(duDb.stdout);

    console.log('--- 5. Database size via SQL ---');
    const sqlSize = await runCommand('docker exec supabase-db psql -U postgres -d postgres -c "SELECT pg_size_pretty(pg_database_size(\'postgres\'));"');
    console.log(sqlSize.stdout);

    console.log('--- 6. Table breakdown via SQL ---');
    const tableSizesQuery = `
      SELECT
        relname AS table_name,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
        pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS index_size
      FROM pg_class c
      LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 10;
    `;
    const tablesSize = await runCommand(`docker exec supabase-db psql -U postgres -d postgres -c "${tableSizesQuery.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
    console.log(tablesSize.stdout);

  } catch (err) {
    console.error('Error executing commands:', err);
  } finally {
    conn.end();
  }
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);

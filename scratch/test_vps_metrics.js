const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

function runSSHCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
      }).stderr.on('data', (data) => {
        stderr += data.toString();
      });
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  console.log("SSH Connected!");
  try {
    const uptime = await runSSHCommand(conn, 'uptime');
    const loadavg = await runSSHCommand(conn, 'cat /proc/loadavg');
    const memory = await runSSHCommand(conn, 'free -m');
    const disk = await runSSHCommand(conn, 'df -h /');

    console.log("--- VPS METRICS ---");
    console.log("Uptime:", uptime.stdout.trim());
    console.log("Loadavg:", loadavg.stdout.trim());
    console.log("Memory:\n", memory.stdout.trim());
    console.log("Disk:\n", disk.stdout.trim());

    console.log("--- DB HEAVY QUERIES ---");
    // Check if pg_stat_statements is available
    const checkExt = await runSSHCommand(conn, `docker exec -i supabase-db psql -U postgres -d postgres -t -c "SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements';"`);
    const isExtAvailable = parseInt(checkExt.stdout.trim(), 10) > 0;
    console.log("pg_stat_statements available:", isExtAvailable);

    let queryCmd = '';
    if (isExtAvailable) {
      queryCmd = `docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT query, calls, round(total_exec_time::numeric, 2) as total_ms, round(mean_exec_time::numeric, 2) as mean_ms FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;"`;
    } else {
      queryCmd = `docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT pid, age(clock_timestamp(), query_start), query FROM pg_stat_activity WHERE state != 'idle' LIMIT 5;"`;
    }

    const dbQueries = await runSSHCommand(conn, queryCmd);
    console.log(dbQueries.stdout);
    if (dbQueries.stderr) console.log("STDERR:", dbQueries.stderr);

  } catch (err) {
    console.error("Error during SSH commands:", err);
  } finally {
    conn.end();
  }
}).on('error', (err) => {
  console.error("SSH Error:", err);
}).connect(config);

const { Client } = require('ssh2');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      let errOutput = '';
      stream.on('close', (code, signal) => {
        if (code !== 0) {
          reject(new Error(errOutput || `Exit code ${code}`));
        } else {
          resolve(output);
        }
      }).on('data', (data) => {
        output += data.toString();
      }).stderr.on('data', (data) => {
        errOutput += data.toString();
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('SSH connection established.');
  try {
    console.log("=== Row count of public.users ===");
    const usersCount = await runQuery("SELECT count(*), role FROM public.users GROUP BY role;");
    console.log(usersCount);

    console.log("=== Row count of public.schools ===");
    const schoolsCount = await runQuery("SELECT count(*) FROM public.schools;");
    console.log(schoolsCount);

    console.log("=== Row count of public.users_raw ===");
    const usersRawCount = await runQuery("SELECT count(*) FROM public.users_raw;");
    console.log(usersRawCount);

    console.log("=== Definition of public.users_raw ===");
    const usersRawDef = await runQuery("SELECT definition FROM pg_views WHERE viewname = 'users_raw';");
    console.log(usersRawDef);

    console.log("=== school_user_statistics execution plan ===");
    const plan = await runQuery("EXPLAIN SELECT * FROM public.school_user_statistics;");
    console.log(plan);

  } catch (err) {
    console.error('Error running queries:', err);
  } finally {
    conn.end();
  }
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);

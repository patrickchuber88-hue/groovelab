const { execSync } = require('child_process');
const { readFileSync } = require('fs');

const sqlCode = readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase/migrations/143_web_push_trigger.sql', 'utf8');

const runSshQuery = () => {
  try {
    const tempPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/run_143.sql';
    const { writeFileSync } = require('fs');
    writeFileSync(tempPath, sqlCode);
    console.log("SQL read and prepared.");

    // Copy to server
    execSync(`scp "${tempPath}" root@178.105.10.2:/tmp/run_143.sql`);
    console.log("SQL copied to server.");

    // Run via docker exec
    const output = execSync('ssh root@178.105.10.2 "docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/run_143.sql"');
    console.log("Database update succeeded:", output.toString());
  } catch (err) {
    console.error("Database update failed:", err.message, err.stdout?.toString(), err.stderr?.toString());
  }
};

runSshQuery();

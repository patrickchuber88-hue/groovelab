import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function run() {
  const db = await open({
    filename: 'supabase/groovelab.db',
    driver: sqlite3.Database
  });

  console.log("--- tables ---");
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  console.log(tables);

  console.log("\n--- users ---");
  try {
    const users = await db.all("SELECT id, first_name, last_name, email, role FROM users");
    console.log(users);
  } catch (err) {
    console.error(err);
  }
}

run();

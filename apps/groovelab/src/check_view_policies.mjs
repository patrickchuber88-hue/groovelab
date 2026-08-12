const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = 'https://supabase.campus-groovelab.de/rest/v1/rpc/execute_sql';

async function run() {
  const sql = `
    DO $$
    DECLARE
      val json;
    BEGIN
      SELECT json_agg(r) INTO val FROM (
        SELECT s.id, s.name, s.subdomain, (SELECT count(*) FROM public.users_raw u WHERE u.school_id = s.id) as user_count
        FROM public.schools s
        ORDER BY s.created_at DESC
        LIMIT 5
      ) r;
      RAISE EXCEPTION 'DIAGNOSTIC_JSON:%', val::text;
    END $$;
  `;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: sql })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();

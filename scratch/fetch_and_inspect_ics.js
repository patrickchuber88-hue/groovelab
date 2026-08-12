import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

async function run() {
  const { data: user, error } = await supabase
    .from('users')
    .select('qr_token')
    .eq('id', SILAS_ID)
    .single();
  
  if (error || !user) {
    console.error("Error finding Silas:", error);
    return;
  }

  const token = user.qr_token;
  console.log(`Silas's QR token: ${token}`);

  const feedUrl = `https://supabase.campus-groovelab.de/functions/v1/ical-feed?token=${token}`;
  console.log(`Fetching feed from: ${feedUrl}`);

  try {
    const res = await fetch(feedUrl);
    const text = await res.text();
    console.log("=== FEED RESPONSE ===");
    console.log(text.substring(0, 1500)); // Print first 1500 chars
    
    // Check if Musikschulfest is in the response text
    if (text.includes("Musikschulfest")) {
      console.log("\n✅ SUCCESS: 'Musikschulfest' IS present in the ICS feed response!");
      // Find the VEVENT block containing Musikschulfest
      const lines = text.split("\r\n");
      let inEvent = false;
      let eventBlock = [];
      for (const line of lines) {
        if (line === "BEGIN:VEVENT") {
          inEvent = true;
          eventBlock = [];
        }
        if (inEvent) {
          eventBlock.push(line);
        }
        if (line === "END:VEVENT") {
          inEvent = false;
          if (eventBlock.join("\n").includes("Musikschulfest")) {
            console.log("\n--- Musikschulfest Event Block ---");
            console.log(eventBlock.join("\n"));
          }
        }
      }
    } else {
      console.log("\n❌ FAILED: 'Musikschulfest' is NOT present in the ICS feed response.");
    }
  } catch (err) {
    console.error("Error fetching feed:", err);
  }
}

run();

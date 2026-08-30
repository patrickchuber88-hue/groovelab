import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const expectedServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Enterprise Auth-Guard: Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") || req.headers.get("apikey") || "";
    const bearerToken = authHeader.replace("Bearer ", "").trim();

    if (!bearerToken || (bearerToken !== expectedAnonKey && bearerToken !== expectedServiceKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized: Valid API key or Authorization token required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not set on the server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transcript } = await req.json();

    if (!transcript || !transcript.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required transcript field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const promptText = `Du bist ein KI-Assistent für Musiklehrer. Fasse das transkribierte gesprochene Wort eines Lehrers prägnant zusammen und erstelle daraus eine übersichtliche, motivierende Hausaufgaben-Stichpunktliste für das digitale Hausaufgabenheft des Schülers. 
WICHTIG: 
- Kürze lange Sätze und reduziere das Transkript auf die wesentlichen Übe-Anweisungen, Hausaufgaben und Ziele.
- Nutze passende Emojis für Instrumente oder Aktionen.
- Schreibe absolut keine Begrüßung, Einleitung, Erklärungen oder abschließende Worte. Starte direkt mit den Stichpunkten.

Lehrer-Transkript:
"${transcript}"`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini API returned error: ${errText}`);
    }

    const result = await geminiResponse.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(
      JSON.stringify({ summary: generatedText.trim() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

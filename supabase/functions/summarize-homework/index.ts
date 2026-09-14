import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const expectedAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const expectedServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Enterprise Auth-Guard: Verify caller has service role or active session lease
    const authHeader = req.headers.get("Authorization") || req.headers.get("apikey") || "";
    const bearerToken = authHeader.replace("Bearer ", "").trim();

    const supabase = createClient(supabaseUrl, expectedServiceKey);

    let isAuthorized = false;
    if (bearerToken && bearerToken === expectedServiceKey) {
      isAuthorized = true;
    } else {
      const leaseToken = req.headers.get("x-session-lease") || "";
      if (leaseToken) {
        const { data: lease } = await supabase
          .from("session_leases")
          .select("id, user_id, revoked_at, is_revoked")
          .eq("id", leaseToken)
          .eq("is_revoked", false)
          .is("revoked_at", null)
          .maybeSingle();
        if (lease && lease.id) {
          isAuthorized = true;
        }
      }
      if (!isAuthorized && bearerToken && bearerToken !== expectedAnonKey) {
        const { data: { user } } = await supabase.auth.getUser(bearerToken);
        if (user) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized: Active authenticated session lease or service key required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transcript } = await req.json();

    if (!transcript || !transcript.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required transcript field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sovereign Local Formatting: Zero US Cloud / Zero third-party API dependencies
    // Clean, format, and structure teacher spoken input locally on Hetzner server
    const cleanLines = transcript
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .map((s: string) => s.replace(/^[•\-\*]\s*/, ''));

    const formattedSummary = cleanLines.join('\n• ');

    return new Response(
      JSON.stringify({ summary: formattedSummary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

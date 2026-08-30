import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.6";

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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const expectedAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Enterprise Auth-Guard: Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") || req.headers.get("apikey") || "";
    const bearerToken = authHeader.replace("Bearer ", "").trim();

    if (!bearerToken || (bearerToken !== expectedAnonKey && bearerToken !== expectedServiceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized: Valid API key or Authorization token required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { userId, title, body, url, notificationId } = await req.json();

    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields (userId, title, body)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check if user has push notifications enabled
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("push_notifications_enabled")
      .eq("id", userId)
      .single();

    if (userErr || !user || !user.push_notifications_enabled) {
      return new Response(JSON.stringify({ success: false, message: "Push notifications not enabled for user" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch push subscriptions for this user
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subErr || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: false, message: "No active push subscriptions found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Configure web-push VAPID details
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "BFN6dZ9Hw1jW14S1CqP2U_lRND1fM6L1n_N9jV5-d14kL6V14hN1c-N8jV5-d14kL6V14hN1c9jV5-d14kL6V14hN1c";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@campus-groovelab.de";

    if (!vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY environment variable is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // 4. Send push payload
    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      notificationId: notificationId || null,
      supabaseUrl,
      supabaseKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
    });

    const sendPromises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      return webpush.sendNotification(pushSubscription, payload).catch((err) => {
        console.error(`Failed to send push notification to ${sub.endpoint}:`, err);
        // Delete invalid or expired subscriptions (statusCode 410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          return supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id)
            .then(() => console.log(`Deleted expired push subscription ${sub.id}`));
        }
      });
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in Deno push execution:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

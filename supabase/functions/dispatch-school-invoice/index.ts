import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-lease",
};

// Helper: Compute SHA-256 hex string from base64 string
async function computeSha256(base64Str: string): Promise<string> {
  const binaryStr = atob(base64Str);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Enterprise Auth-Guard: Caller must be Master Admin or Service Role
    const authHeader = req.headers.get("Authorization") || "";
    const bearerToken = authHeader.replace("Bearer ", "").trim();

    let isAuthorizedMaster = false;
    let callerUserId: string | null = null;

    if (bearerToken && bearerToken === supabaseServiceRoleKey) {
      isAuthorizedMaster = true;
    } else {
      // Check session lease token if passed
      const leaseToken = req.headers.get("x-session-lease") || "";
      if (leaseToken) {
        const { data: lease } = await supabase
          .from("session_leases")
          .select("id, user_id, is_revoked")
          .eq("id", leaseToken)
          .eq("is_revoked", false)
          .maybeSingle();

        if (lease && lease.user_id) {
          callerUserId = lease.user_id;
        }
      }

      // Check standard Supabase bearer token if lease didn't provide user
      if (!callerUserId && bearerToken) {
        const { data: { user } } = await supabase.auth.getUser(bearerToken);
        if (user) {
          callerUserId = user.id;
        }
      }

      if (callerUserId) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, role, is_master_admin")
          .eq("id", callerUserId)
          .maybeSingle();

        if (userData && (userData.is_master_admin === true || userData.role === "master_admin")) {
          isAuthorizedMaster = true;
        }
      }
    }

    if (!isAuthorizedMaster) {
      return new Response(
        JSON.stringify({ 
          error: "Zugriff verweigert: Der B2B-Rechnungsversand ist ausschließlich für autorisierte Master-Administratoren freigegeben." 
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse request payload
    const { invoice_id, pdf_base64, dry_run = false } = await req.json();

    if (!invoice_id || !pdf_base64) {
      return new Response(
        JSON.stringify({ error: "Fehlende Parameter: 'invoice_id' und 'pdf_base64' sind erforderlich." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Load authoritative invoice & school data (SSOT)
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, invoice_number, school_id, amount, billing_date, due_date, status, items")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(
        JSON.stringify({ error: `Rechnung mit ID '${invoice_id}' wurde nicht in der Datenbank gefunden.` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: school, error: schoolErr } = await supabase
      .from("schools")
      .select("id, name, billing_email, email")
      .eq("id", invoice.school_id)
      .single();

    if (schoolErr || !school) {
      return new Response(
        JSON.stringify({ error: `Zugehörige Musikschule (${invoice.school_id}) wurde nicht gefunden.` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Server-Side Address Verification
    const recipientEmail = (school.billing_email || school.email || "").trim();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return new Response(
        JSON.stringify({ 
          error: `Für die Musikschule '${school.name}' ist keine gültige Rechnungs-E-Mail (billing_email) hinterlegt.` 
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Compute cryptographic SHA-256 hash of invoice PDF
    const pdfSha256 = await computeSha256(pdf_base64);

    // 6. SMTP Settings (Option A: Hetzner Mailhost / mail.your-server.de)
    const smtpHost = Deno.env.get("SMTP_HOST") || "mail.your-server.de";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587", 10);
    const smtpUser = Deno.env.get("SMTP_USER") || "";
    const smtpPass = Deno.env.get("SMTP_PASS") || "";
    const smtpFrom = Deno.env.get("SMTP_FROM") || "rechnung@campus-groovelab.de";
    const smtpSenderName = Deno.env.get("SMTP_SENDER_NAME") || "Campus-Groovelab Plattformabrechnung";

    const invoiceNumber = invoice.invoice_number || invoice.id;
    const formattedAmount = Number(invoice.amount || 0).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    });
    const billingDateStr = invoice.billing_date || new Date().toLocaleDateString("de-DE");

    const emailSubject = `Rechnung ${invoiceNumber} für Campus-Groovelab Cloud-Infrastruktur – ${school.name}`;
    const emailBody = `Sehr geehrte Damen und Herren der ${school.name},

anbei erhalten Sie die offizielle Abrechnung ${invoiceNumber} für die Bereitstellung Ihrer Campus-Groovelab Cloud- und Server-Infrastruktur für den Leistungszeitraum ${billingDateStr}.

──────────────────────────────────────────────────────────
ABRECHNUNGSDATEN IM ÜBERBLICK
──────────────────────────────────────────────────────────
• Rechnungsnummer:   ${invoiceNumber}
• Rechnungsdatum:    ${billingDateStr}
• Rechnungsbetrag:   ${formattedAmount} (Steuerbefreit gem. § 4 Nr. 21 UStG / § 19 UStG)
• Verwendungszweck:  ${invoiceNumber}
• Beleg-Prüfsumme:   SHA256:${pdfSha256}
──────────────────────────────────────────────────────────

Das offizielle, revisionssichere Beleg-PDF finden Sie als Dateianhang zu dieser E-Mail.

Bei Fragen zu Ihrer Abrechnung steht Ihnen unser Plattform-Support jederzeit gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Campus-Groovelab Plattformbetrieb
https://campus-groovelab.de`;

    // 7. Dispatch Execution: Simulated Dry-Run or Live SMTP
    let dispatchStatus = "delivered";
    let messageId = `<invoice-${invoiceNumber}-${Date.now()}@campus-groovelab.de>`;
    let errorDetails: string | null = null;

    if (dry_run || !smtpUser || !smtpPass) {
      // Graceful simulated dry-run mode (used during local testing or before SMTP credentials are set)
      dispatchStatus = "simulated";
      messageId = `<simulated-${Date.now()}@campus-groovelab.de>`;
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: true,
            minVersion: "TLSv1.2",
          },
        });

        const sendResult = await transporter.sendMail({
          from: `"${smtpSenderName}" <${smtpFrom}>`,
          to: recipientEmail,
          subject: emailSubject,
          text: emailBody,
          attachments: [
            {
              filename: `Rechnung_${invoiceNumber}.pdf`,
              content: pdf_base64,
              encoding: "base64",
              contentType: "application/pdf",
            },
          ],
        });

        messageId = sendResult.messageId || messageId;
        dispatchStatus = "delivered";
      } catch (smtpErr: any) {
        dispatchStatus = "failed";
        errorDetails = smtpErr.message || "SMTP-Zustellfehler beim Verbindungsaufbau";
      }
    }

    // 8. Record GoBD Dispatch Ledger Entry via RPC
    const { data: recordData, error: recordErr } = await supabase.rpc("record_school_invoice_dispatch", {
      p_invoice_id: invoice.id,
      p_school_id: school.id,
      p_recipient_email: recipientEmail,
      p_status: dispatchStatus,
      p_pdf_sha256: pdfSha256,
      p_smtp_message_id: messageId,
      p_error_details: errorDetails,
    });

    if (recordErr) {
      console.error("[dispatch-school-invoice] RPC record_school_invoice_dispatch error:", recordErr);
    }

    if (dispatchStatus === "failed") {
      return new Response(
        JSON.stringify({
          success: false,
          error: errorDetails,
          invoice_id: invoice.id,
          recipient_email: recipientEmail,
          status: "failed",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: dispatchStatus,
        message_id: messageId,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        recipient_email: recipientEmail,
        pdf_sha256: pdfSha256,
        dispatched_at: new Date().toISOString(),
        is_simulated: dispatchStatus === "simulated",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[dispatch-school-invoice] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interner Serverfehler beim Rechnungsversand." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

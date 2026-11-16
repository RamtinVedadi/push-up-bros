// Deploy with: supabase functions deploy send-sms
// Configure secrets on the server, never in the browser:
// SMS_API_URL, SMS_API_TOKEN, SMS_TOKEN_HEADER (optional, defaults to Authorization)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = auth.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await service.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: cors });
    const { message, phones } = await req.json();
    if (typeof message !== "string" || !message.trim() || !Array.isArray(phones) || phones.length < 1 || phones.length > 100) {
      return new Response(JSON.stringify({ error: "Provide a message and 1-100 phone numbers" }), { status: 400, headers: cors });
    }
    const normalized = phones.map((p: string) => String(p).replace(/[\s()-]/g, "")).filter((p: string) => /^\+989\d{9}$/.test(p));
    if (!normalized.length) return new Response(JSON.stringify({ error: "No valid Iranian mobile numbers" }), { status: 400, headers: cors });
    const apiUrl = Deno.env.get("SMS_API_URL") || "https://api.free-sms.ir/v1/send";
    const apiToken = Deno.env.get("SMS_API_TOKEN");
    if (!apiToken) return new Response(JSON.stringify({ error: "Set SMS_API_TOKEN in Supabase function secrets" }), { status: 503, headers: cors });
    const line = Deno.env.get("SMS_LINE");
    if (!line) return new Response(JSON.stringify({ error: "Set SMS_LINE in Supabase function secrets" }), { status: 503, headers: cors });
    const header = Deno.env.get("SMS_TOKEN_HEADER") || "Authorization";
    const providerResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", [header]: header.toLowerCase() === "authorization" ? `Bearer ${apiToken}` : apiToken },
      body: JSON.stringify({ line, to: normalized, text: message })
    });
    const providerBody = await providerResponse.text();
    if (!providerResponse.ok) return new Response(JSON.stringify({ error: "SMS provider error", status: providerResponse.status, detail: providerBody.slice(0, 500) }), { status: 502, headers: cors });
    return new Response(JSON.stringify({ success: true, recipients: normalized.length, provider: providerBody.slice(0, 500) }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), { status: 500, headers: cors });
  }
});

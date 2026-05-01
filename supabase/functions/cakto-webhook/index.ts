// Webhook da Cakto - recebe eventos de pagamento e atualiza assinatura
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cakto-signature, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CAKTO_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "";

function detectPlano(payload: any): string | null {
  const offer = (
    payload?.offer_name ||
    payload?.product_name ||
    payload?.plan_name ||
    payload?.product?.name ||
    payload?.data?.product?.name ||
    ""
  )
    .toString()
    .toLowerCase();
  if (offer.includes("anual") || offer.includes("annual") || offer.includes("ano")) return "anual";
  if (offer.includes("semestral") || offer.includes("semes")) return "semestral";
  if (offer.includes("mensal") || offer.includes("monthly") || offer.includes("month")) return "mensal";
  const valor = Number(
    payload?.amount ?? payload?.value ?? payload?.total ?? payload?.data?.amount ?? 0
  );
  if (valor >= 1000) return "anual";
  if (valor >= 500) return "semestral";
  if (valor >= 100) return "mensal";
  return null;
}

function nextChargeFromPlano(plano: string): Date {
  const d = new Date();
  if (plano === "anual") d.setFullYear(d.getFullYear() + 1);
  else if (plano === "semestral") d.setMonth(d.getMonth() + 6);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validação simples de secret (header ou query string)
    if (CAKTO_SECRET) {
      const sig =
        req.headers.get("x-cakto-signature") ?? req.headers.get("x-webhook-secret") ?? "";
      const url = new URL(req.url);
      const querySecret = url.searchParams.get("secret") ?? "";
      if (sig !== CAKTO_SECRET && querySecret !== CAKTO_SECRET) {
        console.warn("[cakto-webhook] secret inválido");
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json().catch(() => ({}));
    console.log("[cakto-webhook] payload:", JSON.stringify(payload).slice(0, 1500));

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const empresaId =
      payload?.metadata?.empresa_id ||
      payload?.external_id ||
      payload?.customer?.external_id ||
      payload?.custom_fields?.empresa_id ||
      payload?.empresa_id ||
      payload?.data?.metadata?.empresa_id ||
      payload?.data?.external_id ||
      null;

    const eventType = (
      payload?.event ||
      payload?.event_type ||
      payload?.status ||
      payload?.data?.status ||
      "unknown"
    )
      .toString()
      .toLowerCase();
    const eventId = (
      payload?.id ||
      payload?.event_id ||
      payload?.transaction_id ||
      payload?.data?.id ||
      crypto.randomUUID()
    ).toString();
    const transactionId = payload?.transaction_id || payload?.id || payload?.data?.id || null;
    const subscriptionId =
      payload?.subscription_id ||
      payload?.subscription?.id ||
      payload?.data?.subscription_id ||
      null;
    const valor =
      Number(payload?.amount ?? payload?.value ?? payload?.total ?? payload?.data?.amount ?? 0) ||
      null;
    const metodo =
      payload?.payment_method || payload?.method || payload?.data?.payment_method || null;
    const customerId =
      payload?.customer?.id || payload?.customer_id || payload?.data?.customer?.id || null;
    const plano = detectPlano(payload);

    if (!empresaId) {
      console.warn("[cakto-webhook] sem empresa_id no payload");
      return new Response(JSON.stringify({ ok: true, warning: "no empresa_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insere pagamento (idempotente via cakto_event_id)
    const { error: insErr } = await supabase.from("pagamentos").insert({
      empresa_id: empresaId,
      cakto_event_id: eventId,
      cakto_transaction_id: transactionId,
      cakto_subscription_id: subscriptionId,
      tipo_evento: eventType,
      status: eventType,
      valor,
      metodo,
      plano,
      raw_payload: payload,
    });
    if (insErr && !insErr.message.includes("duplicate")) {
      console.error("insert pagamento:", insErr);
    }

    const isApproved = /approved|paid|completed|success|active|renewed/i.test(eventType);
    const isFailed = /refused|failed|declined|chargeback/i.test(eventType);
    const isCanceled = /cancel|expired/i.test(eventType);
    const isRefunded = /refund/i.test(eventType);

    const update: Record<string, any> = {
      cakto_last_event: payload,
      updated_at: new Date().toISOString(),
    };
    if (customerId) update.cakto_customer_id = customerId;
    if (subscriptionId) update.cakto_subscription_id = subscriptionId;

    if (isApproved && plano) {
      update.plano = plano;
      update.status_assinatura = "ativa";
      update.assinatura_inicio = new Date().toISOString();
      update.assinatura_proxima_cobranca = nextChargeFromPlano(plano).toISOString();
    } else if (isFailed) {
      update.status_assinatura = "atrasada";
    } else if (isCanceled || isRefunded) {
      update.status_assinatura = "cancelada";
    }

    const { error: updErr } = await supabase
      .from("empresas")
      .update(update)
      .eq("id", empresaId);
    if (updErr) console.error("update empresa:", updErr);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[cakto-webhook] erro:", e);
    // 200 para não fazer Cakto reentregar em loop
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

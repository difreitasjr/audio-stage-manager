import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const callerId = claims.claims.sub;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { user_id, ativo } = body ?? {};
    if (!user_id || typeof ativo !== "boolean") {
      return new Response(JSON.stringify({ error: "user_id e ativo (boolean) obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validar mesma empresa (multi-tenant)
    const { data: callerProf } = await admin.from("profiles").select("empresa_id").eq("user_id", callerId).maybeSingle();
    const { data: targetProf } = await admin.from("profiles").select("empresa_id").eq("user_id", user_id).maybeSingle();
    if (!callerProf?.empresa_id || callerProf.empresa_id !== targetProf?.empresa_id) {
      return new Response(JSON.stringify({ error: "Forbidden: usuário de outra empresa" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update profile flag (bypass RLS via service role)
    const { error: profErr } = await admin.from("profiles").update({ ativo }).eq("user_id", user_id);
    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ban or unban via Supabase Auth so existing tokens are rejected
    const { error: banErr } = await admin.auth.admin.updateUserById(user_id, {
      ban_duration: ativo ? "none" : "876000h",
    });
    if (banErr) {
      return new Response(JSON.stringify({ error: banErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

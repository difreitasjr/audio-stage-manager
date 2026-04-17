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
    const { email, password, nome, setor_id, role } = body ?? {};
    if (!email || !password || !nome || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, nome, role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["admin", "staff"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof password !== "string" || password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Falha ao criar usuário" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newUserId = created.user.id;

    // The handle_new_user trigger creates a profile. Update setor_id.
    await admin.from("profiles").update({ nome, setor_id: setor_id || null }).eq("user_id", newUserId);

    // Insert role (avoid duplicate)
    await admin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleInsErr } = await admin.from("user_roles").insert({ user_id: newUserId, role });
    if (roleInsErr) {
      return new Response(JSON.stringify({ error: roleInsErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

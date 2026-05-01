// Public endpoint: set conferente_nome and move status to em_conferencia.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, nome } = await req.json();
    if (!token || typeof token !== "string") return json({ error: "Token inválido" }, 400);
    if (!nome || typeof nome !== "string" || nome.trim().length < 2 || nome.length > 120) {
      return json({ error: "Nome inválido" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conf } = await supabase
      .from("conferencias_chegada")
      .select("id, status")
      .eq("token", token)
      .maybeSingle();
    if (!conf) return json({ error: "Conferência não encontrada" }, 404);
    if (conf.status === "concluida") return json({ error: "Conferência já finalizada" }, 400);

    const { error } = await supabase
      .from("conferencias_chegada")
      .update({
        conferente_nome: nome.trim(),
        status: "em_conferencia",
      })
      .eq("id", conf.id);
    if (error) throw error;

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

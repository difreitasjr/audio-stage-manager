// Public endpoint: finalize the conferencia.
// Só permite finalizar se TODOS os itens estiverem conferidos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, observacoes } = await req.json();
    if (!token) return json({ error: "Token inválido" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conf } = await supabase
      .from("conferencias_chegada")
      .select("id, ordem_id, status")
      .eq("token", token)
      .maybeSingle();
    if (!conf) return json({ error: "Conferência não encontrada" }, 404);

    // Verifica itens pendentes
    const { data: itens, error: itensErr } = await supabase
      .from("conferencia_itens")
      .select("id, conferido")
      .eq("conferencia_id", conf.id);
    if (itensErr) return json({ error: itensErr.message }, 500);

    const total = itens?.length || 0;
    const pendentes = (itens || []).filter((i: any) => !i.conferido).length;

    if (total === 0) {
      return json({ error: "Não há itens para conferir nesta ordem." }, 400);
    }
    if (pendentes > 0) {
      return json({
        error: `Não é possível finalizar: faltam ${pendentes} ${pendentes === 1 ? "item" : "itens"} para conferir.`,
        pendentes,
        total,
      }, 400);
    }

    const { error } = await supabase
      .from("conferencias_chegada")
      .update({
        status: "concluida",
        finalizada_em: new Date().toISOString(),
        observacoes_finais: observacoes || null,
      })
      .eq("id", conf.id);
    if (error) throw error;

    // Marca a ordem como em_andamento (chegou no local)
    await supabase
      .from("ordens_servico")
      .update({ status: "em_andamento" })
      .eq("id", conf.ordem_id)
      .eq("status", "aberta");

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

// Public endpoint: remove a conferencia item — apenas itens avulsos podem ser removidos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, item_id } = await req.json();
    if (!token || !item_id) return json({ error: "Parâmetros inválidos" }, 400);

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

    const { data: item } = await supabase
      .from("conferencia_itens")
      .select("id, is_avulso")
      .eq("id", item_id)
      .eq("conferencia_id", conf.id)
      .maybeSingle();
    if (!item) return json({ error: "Item não encontrado" }, 404);
    if (!item.is_avulso) return json({ error: "Apenas itens avulsos podem ser removidos" }, 400);

    const { error } = await supabase.from("conferencia_itens").delete().eq("id", item.id);
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

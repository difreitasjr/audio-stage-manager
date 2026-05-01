// Public endpoint: mark a conferencia item as checked, by equipamento_id or code.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { token, equipamento_id, codigo, metodo, observacao, conferido } = body;
    if (!token) return json({ error: "Token inválido" }, 400);

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

    // Resolve equipamento_id: se veio direto, usa; senão, busca por código.
    let equipId = equipamento_id;
    if (!equipId && codigo) {
      const c = String(codigo).trim();
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let found: any = null;
      if (uuidRe.test(c)) {
        const { data } = await supabase.from("equipamentos").select("id").eq("id", c).maybeSingle();
        found = data;
      }
      if (!found) {
        const { data } = await supabase.from("equipamentos").select("id")
          .or(`codigo_barras.eq.${c},numero_serie.eq.${c},numero_patrimonio.eq.${c}`)
          .maybeSingle();
        found = data;
      }
      if (!found) return json({ error: `Equipamento não encontrado para o código: ${c}` }, 404);
      equipId = found.id;
    }
    if (!equipId) return json({ error: "Informe equipamento_id ou codigo" }, 400);

    // Verifica se o item pertence à conferência
    const { data: item } = await supabase
      .from("conferencia_itens")
      .select("id")
      .eq("conferencia_id", conf.id)
      .eq("equipamento_id", equipId)
      .maybeSingle();
    if (!item) return json({ error: "Equipamento não faz parte desta ordem" }, 404);

    const isConferido = conferido !== false; // default true
    const { error } = await supabase
      .from("conferencia_itens")
      .update({
        conferido: isConferido,
        metodo_conferencia: metodo || "manual",
        observacao: observacao || null,
        conferido_em: isConferido ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    if (error) throw error;

    return json({ ok: true, equipamento_id: equipId }, 200);
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

// Public endpoint: returns OS data + items for a conferencia by token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token || token.length < 8) {
      return json({ error: "Token inválido" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conf, error: confErr } = await supabase
      .from("conferencias_chegada")
      .select("id, ordem_id, conferente_nome, status, finalizada_em, observacoes_finais")
      .eq("token", token)
      .maybeSingle();

    if (confErr || !conf) return json({ error: "Conferência não encontrada" }, 404);

    const { data: ordem } = await supabase
      .from("ordens_servico")
      .select("numero, cliente, contato_cliente, local_evento, data_saida, data_retorno_prevista, descricao_servico, setor_id, setores(nome)")
      .eq("id", conf.ordem_id)
      .maybeSingle();

    const { data: itens } = await supabase
      .from("conferencia_itens")
      .select("id, equipamento_id, conferido, metodo_conferencia, observacao, conferido_em, equipamentos(nome, marca, modelo, numero_serie, codigo_barras, numero_patrimonio, foto_url)")
      .eq("conferencia_id", conf.id)
      .order("created_at");

    return json({ conferencia: conf, ordem, itens: itens || [] }, 200);
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

// Public endpoint: mark a conferencia item as checked.
// Suporta:
//  - equipamento_id (direto)
//  - codigo (barras / nº série / patrimônio / uuid)
//  - nome (busca parcial entre os equipamentos da OS desta conferência)
//  - avulso=true + nome (cria item avulso novo, já marcado como conferido)
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
    const { token, equipamento_id, codigo, nome, avulso, metodo, observacao, conferido } = body;
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

    // --- Modo: item avulso (cria novo registro) ---
    if (avulso === true) {
      const nm = String(nome || "").trim();
      if (nm.length < 2 || nm.length > 200) {
        return json({ error: "Nome do item avulso deve ter entre 2 e 200 caracteres" }, 400);
      }
      const { data: novo, error: insErr } = await supabase
        .from("conferencia_itens")
        .insert({
          conferencia_id: conf.id,
          equipamento_id: null,
          is_avulso: true,
          nome_avulso: nm,
          conferido: true,
          metodo_conferencia: "avulso",
          observacao: observacao ? String(observacao).trim().slice(0, 500) : null,
          conferido_em: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      return json({ ok: true, avulso: true, item_id: novo.id }, 200);
    }

    // --- Modo: busca por nome (entre os itens da OS) ---
    if (!equipamento_id && !codigo && nome) {
      const nm = String(nome).trim();
      if (nm.length < 2) return json({ error: "Digite ao menos 2 caracteres do nome" }, 400);

      const { data: rows } = await supabase
        .from("conferencia_itens")
        .select("id, equipamento_id, conferido, equipamentos:equipamento_id(id, nome, marca, modelo, numero_serie)")
        .eq("conferencia_id", conf.id)
        .eq("is_avulso", false)
        .not("equipamento_id", "is", null);

      const matches = (rows || []).filter((r: any) =>
        r.equipamentos?.nome && String(r.equipamentos.nome).toLowerCase().includes(nm.toLowerCase())
      );

      if (matches.length === 0) {
        return json({ error: `Nenhum equipamento da OS com "${nm}" no nome. Você pode adicioná-lo como item avulso.` }, 404);
      }
      if (matches.length > 1) {
        return json({
          multiple: true,
          matches: matches.map((m: any) => ({
            item_id: m.id,
            equipamento_id: m.equipamento_id,
            nome: m.equipamentos?.nome,
            marca: m.equipamentos?.marca,
            modelo: m.equipamentos?.modelo,
            numero_serie: m.equipamentos?.numero_serie,
            conferido: m.conferido,
          })),
        }, 200);
      }
      // 1 match → marca direto
      const only = matches[0] as any;
      const { error: upErr } = await supabase
        .from("conferencia_itens")
        .update({
          conferido: true,
          metodo_conferencia: "nome",
          observacao: observacao || null,
          conferido_em: new Date().toISOString(),
        })
        .eq("id", only.id);
      if (upErr) throw upErr;
      return json({ ok: true, equipamento_id: only.equipamento_id }, 200);
    }

    // --- Modo: equipamento_id ou código (fluxo original) ---
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
    if (!equipId) return json({ error: "Informe equipamento_id, codigo ou nome" }, 400);

    const { data: item } = await supabase
      .from("conferencia_itens")
      .select("id")
      .eq("conferencia_id", conf.id)
      .eq("equipamento_id", equipId)
      .maybeSingle();
    if (!item) return json({ error: "Equipamento não faz parte desta ordem" }, 404);

    const isConferido = conferido !== false;
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

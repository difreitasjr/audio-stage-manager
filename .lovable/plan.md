# Corrigir card "Conferência de chegada" sumido (OS #4)

## Diagnóstico

Consulta no banco mostrou que a OS #4 tem **2 conferências de chegada** (duplicadas) e **8 itens de conferência** (4 equipamentos × 2). Isso ocorreu porque, na migração anterior, o trigger `AFTER INSERT` foi anexado **e** um backfill foi executado em sequência, criando registros duplicados para a mesma OS.

O componente `ConferenciaPanel` usa `.maybeSingle()` ao buscar a conferência. Quando há mais de uma linha, o Supabase retorna erro e o componente cai no estado "Nenhuma conferência associada a esta OS ainda" — exatamente o print 2.

OSs #1, #2 e #3 funcionam (1 conferência cada). Apenas a #4 tem duplicata.

## Plano de correção

### 1. Migração SQL — limpar duplicatas e blindar contra novas

- **Deduplicar `conferencias_chegada`**: para cada `ordem_id` com mais de uma linha, manter a mais antiga (a que já tem itens vinculados) e remover as demais. Antes de deletar a duplicata, mover quaisquer `conferencia_itens` órfãos para a conferência mantida (deduplicando por `equipamento_id`).
- **Deduplicar `conferencia_itens`**: dentro de cada conferência, manter apenas uma linha por `equipamento_id` (preservando a que já estiver `conferido = true`, se houver).
- **Criar índice único `uniq_conferencia_ordem`** em `conferencias_chegada(ordem_id)` para garantir 1 conferência por OS.
- **Criar índice único `uniq_conferencia_item_equip`** em `conferencia_itens(conferencia_id, equipamento_id)` (apenas onde `is_avulso = false`) para impedir itens duplicados.
- **Tornar a função `create_conferencia_for_ordem` idempotente**: usar `INSERT ... ON CONFLICT (ordem_id) DO NOTHING` para que execuções concorrentes ou backfills futuros nunca criem duplicatas.
- **Tornar `sync_conferencia_itens` idempotente**: `ON CONFLICT (conferencia_id, equipamento_id) DO NOTHING`.

### 2. Frontend — defensivo

- Em `src/pages/OrdensServico.tsx`, na query do `ConferenciaPanel`, trocar `.maybeSingle()` por uma busca ordenada por `created_at asc` com `limit(1)` e pegar o primeiro elemento. Assim, mesmo que algum dia surja duplicata, o card continua sendo renderizado em vez de sumir silenciosamente.

## O que **não** muda

- Toda a UI do card de conferência (QR code, link, conferente, botões Copiar/Abrir) permanece intacta.
- A tela de Conferência Pública e seus checkboxes recém-adicionados ficam como estão.
- Os triggers de criação automática de conferência e sync de itens continuam ativos — apenas ficam idempotentes.

## Resultado esperado

Após a migração, a OS #4 voltará a exibir o card "Conferência de chegada" igual ao print 1, com QR code e link válidos, e duplicatas não poderão mais ser criadas.

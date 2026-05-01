## Objetivo

No campo de conferência pública (tela do conferente), além de código de barras / nº série / patrimônio, permitir:

1. **Buscar item da OS pelo nome** (match parcial, case-insensitive). Se houver mais de um match, mostrar lista para escolher.
2. **Adicionar item avulso** quando o equipamento não está cadastrado em lugar nenhum — só nome livre + observação opcional. Esses itens aparecem na conferência marcados como "avulsos" e são visíveis no painel `/conferencias` para o admin/staff.

## Mudanças no banco (1 migration)

Adicionar colunas em `conferencia_itens` para suportar item avulso:

- `nome_avulso text NULL` — nome livre digitado pelo conferente
- `is_avulso boolean NOT NULL DEFAULT false`
- Tornar `equipamento_id` **nullable** (hoje é NOT NULL) — itens avulsos não têm equipamento.

RLS atual já cobre os novos campos (políticas baseiam-se em `conferencia_id` → ordem → setor).

## Edge function: `conferencia-mark-item`

Estender o body aceito:

- Se vier `equipamento_id` ou `codigo` → fluxo atual (inalterado).
- **Novo:** se vier `nome` (string) e nenhum código:
  - Buscar entre os itens da conferência (`conferencia_itens` JOIN `equipamentos`) onde `equipamentos.nome ILIKE %nome%`.
  - 1 match → marca como conferido (`metodo = 'nome'`).
  - >1 match → retorna `{ matches: [{id, nome, marca, modelo}] }` com status 300/200 para o front exibir lista de escolha.
  - 0 match → retorna 404 com mensagem clara ("Nenhum equipamento da OS bate com esse nome").
- **Novo:** se vier `avulso: true` + `nome` (+ `observacao` opcional):
  - Cria nova linha em `conferencia_itens` com `is_avulso=true`, `nome_avulso=nome`, `equipamento_id=null`, `conferido=true`, `metodo_conferencia='avulso'`, `observacao`.

Validação: `nome` mínimo 2, máximo 200 chars (zod).

## UI: `src/pages/ConferenciaPublica.tsx`

No bloco do input de código:

```text
[ Digite código ou nome do equipamento ] [OK] [Scanner]
[ + Adicionar item avulso (não cadastrado) ]
```

- Heurística do botão OK / Enter: se o texto bate com regex de código (alphanumeric sem espaços e ≥4 chars com dígito) → enviar como `codigo`. Caso contrário → enviar como `nome`. (Além disso adicionar dropdown "Procurar por: [Código ▾ / Nome]" para forçar o modo se quiser.)
- Se a função retornar múltiplos matches por nome → abrir um pequeno `Dialog` listando os equipamentos para o conferente clicar e confirmar.
- Botão **"+ Adicionar item avulso"** abre um Dialog:
  - Campo "Nome do equipamento *"
  - Campo "Observação" (opcional)
  - Botão "Adicionar e marcar como conferido"
- Renderização da lista de itens: itens avulsos exibem badge "Avulso" e mostram `nome_avulso` em vez de `equipamentos.nome`. Permitir remover item avulso (só itens avulsos, antes da finalização) via novo endpoint OU campo no `conferencia-mark-item` com `action: 'remove'`. Para escopo enxuto: incluir um endpoint mínimo `conferencia-remove-item` aceitando `{token, item_id}` que só apaga linhas com `is_avulso=true`.

## UI: `src/pages/Conferencias.tsx` (painel interno)

Pequenos ajustes para que itens avulsos apareçam corretamente:

- Ao listar itens com problema/observação, exibir `nome_avulso` quando `is_avulso=true` (em vez de `equipamentos.nome`).
- Adicionar badge "Avulso" para distinguir.

## Edge function: `conferencia-get`

Incluir os novos campos (`is_avulso`, `nome_avulso`) no SELECT de `conferencia_itens`.

## Arquivos afetados

- **migration nova** — colunas `nome_avulso`, `is_avulso` em `conferencia_itens`; tornar `equipamento_id` nullable.
- `supabase/functions/conferencia-mark-item/index.ts` — busca por nome + criação de item avulso.
- `supabase/functions/conferencia-get/index.ts` — incluir novos campos.
- `supabase/functions/conferencia-remove-item/index.ts` — **novo** (remover item avulso).
- `src/pages/ConferenciaPublica.tsx` — input multimodo, dialog de múltiplos matches, dialog de item avulso, badges.
- `src/pages/Conferencias.tsx` — exibir avulsos corretamente.
- `src/integrations/supabase/types.ts` — regenerado automaticamente.

## Fora do escopo

- Promover item avulso a equipamento permanente do estoque (pode ser um próximo passo: botão no painel "Cadastrar como equipamento").

## Conferência de Retorno ao Estoque

Fluxo interno (Admin/Staff logado) para conferir item-a-item os equipamentos que voltam de uma OS, com baixa automática no estoque, registro de movimentações, criação de manutenção quando necessário e relatórios.

### 1. Banco de dados (migration)

Nova tabela espelhando o padrão de `conferencias_chegada`, mas sem token público:

- **`conferencias_retorno`**: `id`, `ordem_id`, `status` (pendente/em_andamento/finalizada), `conferente_id` (uuid → auth user), `iniciada_em`, `finalizada_em`, `observacoes_finais`, `created_at`, `updated_at`.
- **`conferencia_retorno_itens`**: `id`, `conferencia_id`, `equipamento_id`, `quantidade_esperada`, `quantidade_conferida`, `destino` enum (`disponivel` | `manutencao` | `danificado` | `pendente`), `observacao`, `conferido` bool, `conferido_em`, `conferido_por`.
- Enum novo: `destino_retorno` (`disponivel`,`manutencao`,`danificado`,`pendente`).
- **RLS**: mesmo padrão de chegada — admin tudo; staff vê/edita apenas registros cujo `ordens_servico.setor_id = get_user_setor(auth.uid())`.
- **Trigger** `create_conferencia_retorno_for_ordem`: ao alterar `ordens_servico.status` para `em_andamento`/`em_uso` (saída efetivada) **ou** ao chamar manualmente, cria `conferencias_retorno` + popula `conferencia_retorno_itens` a partir de `ordem_equipamentos`. Decisão: criar a conferência de retorno **sob demanda** (botão "Iniciar Retorno" na OS) para evitar entradas órfãs.
- Função `finalizar_conferencia_retorno(conf_id)` SECURITY DEFINER: ao chamar, para cada item:
  - `disponivel` → atualiza `equipamentos.status='disponivel'` + insere `movimentacao_estoque(tipo='retorno')`.
  - `manutencao` → atualiza `equipamentos.status='manutencao'` + insere `manutencao(equipamento_id, tipo_reparo, descricao)` + `movimentacao_estoque(tipo='retorno_manutencao')`.
  - `danificado` → atualiza `equipamentos.status='danificado'` + `movimentacao_estoque(tipo='retorno_danificado')`.
  - `pendente` → não dá baixa; mantém OS aberta para conferência futura.
  - Se todos os itens não-pendentes: marca `ordens_servico.status='finalizada'` e `conferencias_retorno.status='finalizada'`.

### 2. Edge functions

- `conferencia-retorno-iniciar` (POST `{ ordem_id }`): valida JWT + role/setor, cria conferência se não existir, retorna id.
- `conferencia-retorno-mark-item` (POST `{ item_id, destino, quantidade_conferida, observacao }`): valida e atualiza item.
- `conferencia-retorno-finalizar` (POST `{ conferencia_id, observacoes_finais }`): chama RPC `finalizar_conferencia_retorno`.
- `conferencia-retorno-get` (GET `?id=`): retorna conferência + itens + dados da OS.

Todas com `verify_jwt = false` em `config.toml` mas validando `getClaims()` no código + checando role via `has_role`.

### 3. Frontend — páginas e componentes

- **`/retornos`** (nova rota interna, no menu lateral) — lista paginada de conferências de retorno (pendente/em_andamento/finalizada) com filtros por setor, status, período. Botão "Abrir conferência".
- **`/retornos/:id`** — tela de execução item-a-item:
  - Header: OS, cliente, data prevista vs real, conferente.
  - Lista de itens com: nome, marca/modelo, qtd esperada, input qtd conferida, **radio** com 4 destinos (Disponibilizar / Enviar para manutenção / Marcar danificado / Deixar pendente), campo observação (obrigatório se manutenção/danificado).
  - Busca/autocomplete por nome (igual conferência pública).
  - Resumo lateral: contadores por destino.
  - Botão "Finalizar conferência" (confirmação modal) → chama edge function.
- **Página da OS** (`Ordens.tsx` / detalhes): substituir botão atual "Marcar como retornada" por **"Iniciar Conferência de Retorno"** que cria a conferência e navega para `/retornos/:id`. Manter botão "Retorno rápido (sem conferência)" só para admin como atalho legado.
- **`/conferencias`** existente: adicionar tabs "Chegada" / "Retorno" para reaproveitar listagem.

### 4. Relatório de Retorno

Em `/relatorios`, nova aba **"Retornos ao Estoque"**:
- Filtros: período (data início/fim), setor, status.
- KPIs: total de itens retornados, % disponibilizados, % manutenção, % danificados, % pendentes.
- Tabela detalhada: OS, equipamento, destino, observação, conferente, data.
- Gráfico de barras por destino + linha temporal (recharts, já em uso).
- Botão exportar CSV (client-side).

### 5. Hooks e tipos

- `src/hooks/useConferenciasRetorno.ts`: `useConferenciasRetorno`, `useConferenciaRetorno(id)`, `useIniciarRetorno`, `useMarcarItemRetorno`, `useFinalizarRetorno` (React Query + invalidação de `equipamentos`, `ordens`, `movimentacao`).
- Atualizar `src/integrations/supabase/types.ts` automaticamente após migration.

### Estrutura de arquivos

```text
supabase/migrations/<timestamp>_conferencia_retorno.sql
supabase/functions/conferencia-retorno-iniciar/index.ts
supabase/functions/conferencia-retorno-mark-item/index.ts
supabase/functions/conferencia-retorno-finalizar/index.ts
supabase/functions/conferencia-retorno-get/index.ts
src/pages/Retornos.tsx                  (lista)
src/pages/RetornoDetalhe.tsx            (execução item-a-item)
src/hooks/useConferenciasRetorno.ts
src/components/relatorios/RelatorioRetornos.tsx
src/pages/Relatorios.tsx                (adicionar aba)
src/pages/Ordens.tsx                    (botão Iniciar Retorno)
src/components/Layout/Sidebar           (item de menu "Retornos")
src/App.tsx                             (rotas)
```

### Fora do escopo

- Conferência de retorno via link público (decidido: apenas logado).
- Notificações automáticas de pendências (pode ser próxima iteração).

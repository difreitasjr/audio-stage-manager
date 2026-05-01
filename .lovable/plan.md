## Permitir desconferir item na Conferência de Chegada

Hoje, ao tique-mark um equipamento, não há como desfazer caso tenha sido marcado por engano (o checkbox e o card ficam disabled após `conferido = true`). Vou habilitar o "desconferir" no fluxo público.

### Mudanças

**1. `src/pages/ConferenciaPublica.tsx`**
- Criar nova função `desmarcarPorId(equipamento_id)` que chama `conferencia-mark-item` com `{ token, equipamento_id, conferido: false }`. Mostra toast "Item desmarcado".
- Ajustar a lógica do card de item (não-avulso, não-concluída):
  - Permitir clique tanto para marcar quanto para desmarcar (toggle).
  - Remover o `disabled={it.conferido}` do `Checkbox` e tratar `onCheckedChange` para chamar `marcar` ou `desmarcar` conforme o novo valor.
  - Quando `it.conferido`, exibir um botão pequeno secundário "Desfazer" (ícone `Undo2` + texto), à direita do card, que dispara `desmarcarPorId`. Mantém o card visualmente em verde, mas com a ação clara para corrigir engano.
- Para itens **avulsos** já marcados, manter o botão Trash (remover) como hoje — desconferir não se aplica porque eles só existem se foram conferidos.
- Após desmarcar, recarregar via `load()` para atualizar progresso.

**2. Backend — sem alterações**
- `supabase/functions/conferencia-mark-item/index.ts` já trata `conferido: false` no fluxo `equipamento_id`, limpando `conferido_em`. Bloqueia corretamente quando a conferência está `concluida`.

**3. Validação de finalização — sem alterações**
- A regra continua valendo: só finaliza com 100% conferidos. Desmarcar reduz o progresso e desabilita o botão "Finalizar" automaticamente.

### Resultado
- Usuário marca item errado → clica em "Desfazer" no card (ou desmarca o checkbox) → item volta para pendente, progresso recalcula, botão de finalizar fica bloqueado até reconferir corretamente.
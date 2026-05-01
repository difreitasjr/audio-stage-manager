Vou corrigir a regra de finalização da Conferência de Chegada para que ela só fique como **Concluída** quando todos os itens estiverem conferidos.

Plano:

1. **Bloquear no botão público de finalização**
   - Em `ConferenciaPublica.tsx`, antes de chamar `conferencia-finalizar`, verificar se `conferidos < total`.
   - Se houver item faltando, mostrar aviso em PT-BR dizendo quantos itens faltam e não enviar a finalização.
   - O botão também passará a indicar melhor o estado quando faltarem itens.

2. **Garantir a regra no backend**
   - Em `supabase/functions/conferencia-finalizar/index.ts`, buscar os itens da conferência antes de atualizar o status.
   - Se existir qualquer item `conferido = false`, retornar erro e manter a conferência em aberto.
   - Só atualizar para `status = 'concluida'` e preencher `finalizada_em` quando `conferidos === total` e `total > 0`.

3. **Corrigir alteração manual de status no painel**
   - Em `src/pages/Conferencias.tsx`, ajustar a ação “Status” para não permitir selecionar/salvar **Concluída** se existirem itens sem conferir.
   - Para isso, antes de salvar como concluída, consultar os itens daquela conferência e validar o progresso.
   - Se houver pendência, mostrar mensagem tipo: “Não é possível concluir: falta conferir 1 item.”

4. **Melhorar exibição do status parcial/em aberto**
   - Quando a conferência estiver finalizada incorretamente ou com progresso incompleto, a interface deve tratar como em aberto/andamento visualmente, não como concluída.
   - Ajustar badges/mensagens para deixar claro que ainda há itens pendentes.

Resultado esperado:
- No exemplo do print, com **3/4**, ao clicar em finalizar, a conferência não muda para **Concluída**.
- Ela continua em aberto/em andamento, mostrando o item que falta conferir.
- Só fica **Concluída** quando chegar em **4/4**.
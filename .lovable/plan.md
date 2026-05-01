## Objetivo

Na tela pública de **Conferência de Chegada** (`/conferencia/:token`), tornar a lista de equipamentos mais ágil colocando um **checkbox grande à esquerda de cada item** para marcar/desmarcar a conferência com um único toque, mantendo todo o restante (busca, scanner, item avulso, finalizar, etc.).

## Observação sobre a screenshot

A tela enviada mostra "Progresso 0/0" e nenhum item — isso significa que a OS em questão foi criada **sem equipamentos** vinculados (`ordem_equipamentos` vazio). A lista renderiza normalmente quando há itens; ela só não aparece porque não há nada para listar. A melhoria abaixo já cobre o caso com itens, e adicionarei também uma mensagem amigável quando a lista estiver vazia.

## Mudanças (apenas `src/pages/ConferenciaPublica.tsx`)

1. **Substituir o botão "Conferir" por um Checkbox** (`@/components/ui/checkbox`) à esquerda do nome de cada item:
   - Checkbox grande (`h-6 w-6`) bem visível.
   - Ao marcar → chama `marcarPorId(it.equipamento_id, "manual")` (já existe).
   - Ao desmarcar (item já conferido) → não removemos a marcação no banco (não há endpoint), mantém ✓ apenas visualmente reforçado; OU melhor: deixamos o checkbox sempre como ação de marcar (uma vez marcado fica verde/desabilitado).
   - Item avulso: continua com botão lixeira para remover.
2. **Layout do item**: `[Checkbox] [Foto] [Nome + meta] [badge avulso/lixeira]`. Cartão inteiro vira clicável (`onClick` no Card chama o checkbox toggle) para ainda mais agilidade no toque.
3. **Mensagem para lista vazia**: quando `itens.length === 0`, mostrar card informativo "Nenhum equipamento vinculado a esta OS. Use 'Adicionar item avulso' para registrar o que chegou."
4. Manter intactos: cabeçalho (OS/cliente/setor/conferente), barra de progresso, input de busca + scanner + sugestões, dialog de múltiplos matches, dialog de item avulso, botão "Finalizar conferência".

## Arquivo afetado
- `src/pages/ConferenciaPublica.tsx`

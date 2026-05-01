## Ajuste: autocomplete por nome no campo de conferência

Adicionar um dropdown de sugestões abaixo do input enquanto o conferente digita, mostrando equipamentos da OS cujo nome contém o texto. Clicar em uma sugestão marca o item como conferido imediatamente.

### Mudança única — `src/pages/ConferenciaPublica.tsx`

No bloco do input de busca (logo abaixo do header da OS), envolver o `<Input>` em um container `relative` e renderizar uma lista flutuante de sugestões.

Lógica de sugestões (computada em cada render, sem estado novo):

- Filtra `itens` carregados (já vêm do backend) onde `is_avulso === false` e `equipamentos.nome` contém o texto digitado (case-insensitive).
- Só mostra se houver ≥1 caractere digitado **e** o texto não parecer código (reusa `looksLikeCode` existente — assim, scanner / código de barras não dispara dropdown).
- Limite de 8 sugestões.

Cada sugestão mostra: nome em destaque, marca/modelo + SN em sublinha, e um indicador "✓ ok" se já foi conferido.

Ao clicar:
- Limpa o campo `busca`.
- Chama `marcarPorId(equipamento_id, "nome")` (função já existente).

O dropdown não substitui o botão **OK** — Enter / OK continuam funcionando como hoje (envia código ou nome e abre dialog de múltiplos matches se necessário). O autocomplete é apenas um atalho visual para os casos comuns.

Estilização: usa tokens semânticos do design system (`bg-popover`, `border`, `shadow-lg`, `hover:bg-muted`) — coerente com o resto da UI.

### O que NÃO muda

- Edge functions (a busca por nome do backend continua disponível para fallback / múltiplos matches).
- Banco de dados.
- Painel `/conferencias`.
- Botão de item avulso continua igual.
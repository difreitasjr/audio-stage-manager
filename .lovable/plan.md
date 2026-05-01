## Problema

A tela de conferência mostra `0/0` em algumas OS porque, embora as funções de banco `create_conferencia_for_ordem` e `sync_conferencia_itens` existam, **elas não estão ligadas como triggers** (não há nenhum trigger no schema `public`). Resultado:

- Nem toda OS criada gera automaticamente sua `conferencias_chegada`.
- Os `conferencia_itens` não são populados a partir de `ordem_equipamentos`.
- A regra "toda OS precisa ter equipamento" só é validada no front (pode ser burlada).

## Correção

### 1. Backend (migração SQL)

- **Anexar os triggers que faltam**:
  - `AFTER INSERT ON ordens_servico` → `create_conferencia_for_ordem()` (cria a conferência + token automaticamente para toda OS nova).
  - `AFTER INSERT OR DELETE ON ordem_equipamentos` → `sync_conferencia_itens()` (insere/remove o item correspondente em `conferencia_itens`).
- **Backfill** das OS existentes:
  - Criar `conferencias_chegada` para qualquer OS sem uma.
  - Inserir em `conferencia_itens` qualquer `ordem_equipamentos` ainda não refletido (com `ON CONFLICT DO NOTHING`).
- **Constraint de integridade**: garantir que toda OS tenha pelo menos 1 equipamento via função + trigger `AFTER INSERT` em `ordens_servico` que valida (deferred via verificação no fluxo) — alternativa mais segura: manter validação no app + adicionar índice único `(ordem_id, equipamento_id)` em `ordem_equipamentos` para evitar duplicados.

### 2. Frontend

- **`src/hooks/useOrdens.ts`** (`useCreateOrdem`):
  - Lançar erro antes do insert se `itens.length === 0` (hoje só tem `toast` no componente, mas a mutation aceita lista vazia).
  - Após inserir `ordem_equipamentos`, fazer um `select` de verificação dos `conferencia_itens` e, se vier vazio, tentar reconciliar manualmente (rede de segurança caso o trigger falhe).
- **`src/pages/OrdensServico.tsx`** (`handleSubmit`): manter validação atual de "ao menos 1 equipamento", reforçar mensagem.
- **`ConferenciaPanel`**: invalidar a query `["conferencia-ordem", ordemId]` ao abrir o modal de visualização (caso a conferência tenha sido criada agora pelo trigger).

### 3. Verificação

Após a migração, rodar `SELECT` para confirmar que toda OS tem 1 conferência e que `conferencia_itens.count == ordem_equipamentos.count` por OS.

## Resultado esperado

- Toda OS nova cria automaticamente sua conferência com QR/token e já vem com todos os equipamentos da OS prontos para serem ticados na tela pública.
- OS antigas sem itens sincronizados ficam consistentes após o backfill.
- Impossível criar OS sem equipamento (validação no app) e impossível ter equipamento da OS faltando na conferência (trigger).

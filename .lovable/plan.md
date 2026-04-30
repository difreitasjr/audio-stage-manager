## Objetivo

Criar um usuário de teste no backend e validar de ponta a ponta que login, RLS por setor, CRUD de equipamento, fluxo de OS (com movimentação automática) e manutenção estão funcionando.

## Estado atual (verificado)

- 2 usuários existem: `resolume7@gmail.com` (admin) e `teste.desativacao@example.com` (staff, sem setor).
- 4 setores cadastrados (Som, Luz, Vídeo, Streaming).
- Tabelas `equipamentos`, `ordens_servico`, `movimentacao_estoque`, `manutencao` estão vazias ou quase.
- Edge function `create-user` já existe.

## O que vou fazer

### 1. Criar usuário de teste
Chamar a edge function `create-user` autenticada como admin com:
- email: `staff.som@teste.com`
- senha: `Teste@1234`
- nome: `Staff Som Teste`
- role: `staff`
- setor: Som (`f3153ccc-...`)

Se a função exigir contexto de admin logado no browser, alternativa: inserir via SQL (auth.users + profile com setor + user_role staff) através de migration.

### 2. Smoke test E2E (via SQL + edge calls, sem UI)
Sequência de validações, cada uma confirmada por `read_query`:

a. **Auth/Profile**: confirmar que `profiles` recebeu `setor_id = Som` e `user_roles.role = 'staff'`.

b. **RLS de leitura**: simular como o staff só veria equipamentos do setor Som (verificando policies já aplicadas em `equipamentos`).

c. **Equipamento**: criar 1 equipamento de teste no setor Som via insert SQL (ex.: "Microfone Shure SM58", categoria Microfone, com `especificacoes` JSONB e `estado_conservacao`).

d. **OS + movimentação automática**: como o disparo de movimento está no hook do front (`useCreateOrdem`), validar manualmente inserindo: 1 ordem + 1 ordem_equipamento + 1 movimentacao tipo `saida`. Depois marcar OS como `retornada` e inserir movimentacao `retorno`. Conferir histórico.

e. **Manutenção**: inserir 1 registro de manutenção no equipamento e validar leitura.

f. **Limpeza opcional**: deletar dados de teste no fim, ou manter para o usuário inspecionar (vou perguntar — default é manter).

### 3. Teste real no browser (opcional, recomendo)
Abrir preview, fazer login com `staff.som@teste.com` / `Teste@1234`, navegar Dashboard → Equipamentos → OS → Movimentação e confirmar visualmente. Reporto screenshots.

## Detalhes técnicos

- Edge function `create-user` será chamada via `supabase--curl_edge_functions` usando token do admin atualmente logado no preview. Se falhar por permissão, fallback: migration SQL inserindo direto em `auth.users` (com `crypt('Teste@1234', gen_salt('bf'))` e `email_confirmed_at = now()`), `profiles` e `user_roles`.
- Inserts de teste em `equipamentos`, `ordens_servico`, `ordem_equipamentos`, `movimentacao_estoque`, `manutencao` via migration (read_query é só SELECT).
- Sem alteração de schema, RLS ou código de aplicação.

## Entregável

Relatório resumido com:
- Credenciais do usuário criado
- ✅/❌ por etapa (auth, RLS, equipamento, OS+saída, retorno, manutenção)
- Quaisquer bugs encontrados durante o fluxo
- Pergunta final: manter ou limpar dados de teste?

## Pergunta antes de executar

Quer manter o usuário de teste depois (para você logar e brincar), ou removo tudo no final?

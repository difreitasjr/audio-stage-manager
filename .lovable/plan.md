
## Diagnóstico

Verifiquei o banco e o código:

- `user_roles` está **vazio** → ninguém tem role `admin` → `isAdmin=false` sempre → dashboard nunca mostra a seção admin.
- A função `handle_new_user` cria o `profile` mas **não tem trigger ativo** (`<db-triggers>` mostra "There are no triggers"), e também não insere role.
- `Login.tsx` ainda mostra "Cadastre-se aqui" — o signUp público entra direto no dashboard porque auto-confirm está ligado, mas o usuário fica sem role/setor → tela vazia.
- Não existe forma de criar o primeiro admin (página Usuários é admin-only → catch-22).

## Correções

### 1. Banco (migration)
- Criar trigger `on_auth_user_created` em `auth.users` que executa `handle_new_user()` (hoje a função existe mas não é chamada).
- Atualizar `handle_new_user()` para também:
  - Inserir role `staff` por padrão em `user_roles`.
  - Se ainda não existe nenhum admin no sistema, promover este novo usuário a `admin` (bootstrap do primeiro admin).

### 2. Login (`src/pages/Login.tsx`)
- Remover o toggle "Cadastre-se aqui" e os campos de signup.
- Tela fica só com email/senha + botão Entrar.

### 3. AuthContext (`src/contexts/AuthContext.tsx`)
- Limpar `signUp` (remover inserts manuais em `profiles`/`user_roles` — o trigger faz isso).
- Garantir que `fetchUserData` é chamado após login e atualiza `role` corretamente.

### 4. Bootstrap do primeiro admin
- Criar rota pública `/setup` (`src/pages/Setup.tsx`) que:
  - Detecta se `user_roles` está vazio (via consulta à edge function ou contagem pública).
  - Mostra formulário (nome, email, senha) que cria o primeiro usuário — o trigger automaticamente o promove a admin.
  - Se já existir admin, redireciona para `/login`.
- Em `App.tsx`: adicionar rota `/setup` pública.

### Fluxo final
```text
Sistema vazio → /setup → cria 1º admin → /login → /dashboard (admin completo)
Admin logado → /usuarios → cria staffs com setor
Staff logado → vê só seu setor
```

### Resultado
- Login não cadastra mais sozinho — só entra.
- Primeiro acesso vai para `/setup` para criar admin.
- Dashboard mostra todos os cards e seções administrativas.
- Novos usuários criados pela tela Usuários recebem role/setor corretos via edge function `create-user` (já existe).

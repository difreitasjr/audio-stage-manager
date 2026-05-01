
## Problema

Hoje a tela `/login` chama a função `admin_exists()` no backend e **só mostra o link "Criar primeiro administrador" se a resposta for `false`**. Como já existe um admin cadastrado (`resolume7@gmail.com`), o sistema retorna `true` e o link some — por isso parece que o sistema "está adivinhando".

Você quer o comportamento inverso: o link deve aparecer **sempre** no /login, e a decisão de permitir ou não a criação fica na própria tela `/setup`.

## Comportamento desejado

- `/login` sempre exibe:
  - Formulário de email/senha (acesso normal)
  - Link "Criar primeiro administrador" → leva para `/setup`
- `/setup`:
  - Se ainda **não existe** admin → mostra o formulário de criação (vira admin automaticamente pelo trigger `handle_new_user`)
  - Se **já existe** admin → mostra uma mensagem clara ("Já existe um administrador. Faça login normalmente.") e um botão para voltar ao /login. Sem redirect automático silencioso.

Assim o usuário sempre vê a opção, e só descobre que já tem admin se clicar — exatamente como você descreveu.

## Mudanças

### 1. `src/pages/Login.tsx`
- Remover o `useEffect` que chama `supabase.rpc("admin_exists")` e o estado `adminExists`.
- Renderizar o link "Criar primeiro administrador" **sempre**, sem condicional.

### 2. `src/pages/Setup.tsx`
- Manter a checagem `admin_exists()` no carregamento, mas em vez de redirecionar para `/login` quando já existe admin, mostrar um card informativo:
  - Título: "Administrador já cadastrado"
  - Texto: "Este sistema já possui um administrador. Use seu email e senha na tela de login."
  - Botão "Voltar ao login" → navega para `/login`
- Quando não existe admin, mantém o formulário atual (nome, email, senha → cria → vira admin via trigger → redireciona para `/bem-vindo`).

## Observações

- Nenhuma mudança de backend/RLS é necessária — a função `handle_new_user` já atribui `admin` ao primeiro usuário e `staff` aos demais automaticamente.
- A rota `/setup` continua pública (sem `ProtectedRoute`), então o link funciona mesmo sem sessão.

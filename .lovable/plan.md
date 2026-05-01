
## Objetivo

Transformar o AV Control em um sistema **multi-empresa (multi-tenant)**, onde cada empresa tem seu próprio admin, usuários e dados totalmente isolados das outras. Ajustar o fluxo de cadastro para que qualquer pessoa possa criar uma nova empresa + admin inicial — só bloqueia se o **email já estiver cadastrado**.

Hierarquia desejada:
```
Empresa A                 Empresa B
  └─ Admin A                └─ Admin B
       └─ Usuários A             └─ Usuários B
       └─ Setores/Equip/OS A     └─ Setores/Equip/OS B
```
Empresas **não enxergam** dados umas das outras (nem admins, nem usuários, nem equipamentos, nem nada).

---

## 1. Mudanças no Banco (multi-tenancy)

### 1.1 Nova tabela `empresas`
```
empresas (id, nome, created_at, updated_at, ativo)
```

### 1.2 Adicionar `empresa_id` em todas as tabelas de domínio
- `profiles`, `user_roles`, `setores`, `equipamentos`, `ordens_servico`, `movimentacao_estoque`, `manutencao`, `conferencias_chegada`, `conferencias_retorno`, `conferencia_itens`, `conferencia_retorno_itens`, `ordem_equipamentos`
- Coluna `empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE`

### 1.3 Função security definer
```sql
get_user_empresa(_user_id uuid) RETURNS uuid
-- retorna empresa_id do profile do usuário
```

### 1.4 Reescrita das policies RLS
Toda policy passa a exigir `empresa_id = get_user_empresa(auth.uid())` **além** das regras atuais (admin/staff/setor). Isso garante isolamento total entre empresas.

Exemplo:
```sql
-- Equipamentos: admin vê tudo da SUA empresa
USING (empresa_id = get_user_empresa(auth.uid())
       AND has_role(auth.uid(), 'admin'))
```

### 1.5 Atualizar `handle_new_user` (trigger de signup)
Novo comportamento baseado em metadata enviada no signUp:

- Se `raw_user_meta_data->>'empresa_nome'` existir (signup de nova empresa):
  1. Cria `empresas` com aquele nome
  2. Cria `profile` com `empresa_id` da nova empresa
  3. Cria `user_roles` com role = `'admin'`
- Se `raw_user_meta_data->>'empresa_id'` existir (admin cadastrando funcionário):
  1. Cria `profile` ligado àquela empresa
  2. Cria `user_roles` com role = `'staff'`

A lógica antiga "primeiro usuário do sistema vira admin" é removida.

### 1.6 Remover/depreciar `admin_exists()`
Não faz mais sentido em sistema multi-tenant.

---

## 2. Mudanças no Fluxo de Cadastro

### 2.1 Nova tela `/cadastro` (substitui `/setup`)
Campos:
- Nome da empresa
- Nome do administrador
- Email
- Senha

Comportamento:
- Sempre acessível pelo link "Criar nova empresa / primeiro acesso" no `/login`
- Submete `signUp` enviando `empresa_nome` e `nome` em `options.data`
- Se o email **já existir**, Supabase retorna erro `User already registered` → mostrar toast: *"Este email já está cadastrado. Faça login."* e botão "Ir para login"
- Se sucesso → login automático → `/bem-vindo`

### 2.2 `/login` (limpar)
- Remove qualquer chamada a `admin_exists`
- Link sempre visível: "Criar nova empresa / primeiro acesso" → `/cadastro`

### 2.3 `/setup` (remover ou redirecionar)
Redirect 301 para `/cadastro`.

---

## 3. Mudanças no Frontend

### 3.1 `AuthContext`
- `signUp(email, password, nome, empresaNome)` — passa `empresa_nome` em options.data
- Novo helper `signUpFuncionario(email, password, nome)` para admins criarem usuários (a edge function `create-user` já cuida disso server-side; ajustar para incluir `empresa_id` do admin chamador)

### 3.2 Edge functions a ajustar
- `create-user`: ao criar usuário, ler `empresa_id` do profile do admin chamador e incluir em `user_metadata` para o trigger
- `reset-user-password`, `toggle-user-ativo`: validar que o usuário-alvo pertence à mesma empresa do admin chamador

### 3.3 Hooks (`useEquipamentos`, `useOrdens`, `useSetores`, `useConferenciasRetorno`)
Não precisam de mudança — RLS já filtra por empresa automaticamente. Inserts precisam incluir `empresa_id` (ou via default/trigger no banco — preferir trigger `BEFORE INSERT` que preenche `empresa_id` com `get_user_empresa(auth.uid())` automaticamente, evitando alterar o frontend todo).

### 3.4 Página `Usuarios.tsx`
Continua igual — RLS garante que admin só vê usuários da própria empresa.

---

## 4. Migração de Dados Existentes

Como já há um admin cadastrado e dados no banco:
1. Criar empresa default `"Empresa Inicial"`
2. Atribuir essa `empresa_id` a todos os registros existentes (profiles, setores, equipamentos, ordens, etc.)
3. Tornar `empresa_id` NOT NULL após o backfill

---

## 5. Detalhes Técnicos

**Trigger de auto-fill de empresa_id** (evita refatorar todos os inserts do frontend):
```sql
CREATE FUNCTION set_empresa_id() RETURNS trigger AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := get_user_empresa(auth.uid());
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```
Aplicado em BEFORE INSERT em cada tabela de domínio.

**Policies revisadas** (exemplo equipamentos):
```sql
DROP POLICY "Admins can select equipamentos" ON equipamentos;
CREATE POLICY "Admins select equipamentos da empresa"
  ON equipamentos FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa(auth.uid())
         AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff select equipamentos do setor"
  ON equipamentos FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa(auth.uid())
         AND setor_id = get_user_setor(auth.uid()));
```
Repetido para todas as 12 tabelas e suas ~54 policies.

**Detecção de email duplicado**: Supabase retorna `AuthApiError: User already registered` no `signUp` — capturar e mostrar mensagem amigável.

---

## 6. Arquivos Afetados

- **DB migration** (nova): tabela `empresas`, colunas `empresa_id`, funções `get_user_empresa`/`set_empresa_id`, novo `handle_new_user`, recriar todas as RLS, backfill de dados
- `src/pages/Cadastro.tsx` (novo, substitui Setup)
- `src/pages/Setup.tsx` (redirect para `/cadastro`)
- `src/pages/Login.tsx` (texto do link)
- `src/contexts/AuthContext.tsx` (assinatura `signUp` com empresaNome)
- `src/App.tsx` (rota `/cadastro`)
- `supabase/functions/create-user/index.ts` (escopar por empresa)
- `supabase/functions/reset-user-password/index.ts` (validar empresa)
- `supabase/functions/toggle-user-ativo/index.ts` (validar empresa)

---

## 7. Resultado Final

- Qualquer pessoa acessa `/login` → clica em "Criar nova empresa" → preenche dados → vira admin da própria empresa
- Cadastro só falha se o **email já existir** no sistema
- Empresas completamente isoladas — admins e usuários não enxergam dados de outras empresas
- Admins continuam podendo cadastrar staff dentro da própria empresa pela tela Usuários

Após aprovar, vou executar tudo: migration, ajustes nas edge functions e telas, e depois te informo o login do admin já cadastrado (que ficará vinculado à "Empresa Inicial").

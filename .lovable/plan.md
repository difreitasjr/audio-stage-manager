
# Revisão para testes com clientes reais

## 1. Login → "Criar primeiro administrador"

**Status atual:** já funciona. `/login` tem o link para `/setup`, que verifica `admin_exists()`. Se não existe admin, cria via `signUp` (handle_new_user atribui automaticamente `admin` ao primeiro usuário) e faz login direto no dashboard. Se já existe admin, redireciona para `/login`.

**Ação:** nenhuma correção necessária. Apenas adicionar uma pequena melhoria de UX: mostrar mensagem clara se a página `/setup` for acessada quando já existe admin (hoje só redireciona em silêncio).

---

## 2. Usuários — papéis admin vs staff

### 2a. Bug crítico a corrigir agora
O arquivo `src/pages/Usuarios.tsx` está com JSX quebrado: o `<Dialog>` de "Redefinir senha" foi colado **dentro** do `<form>` de edição (linhas 267–283), e fecha tags `</div>` extras. Isso provavelmente está causando comportamento estranho/erro de render. Vou reorganizar o arquivo movendo o dialog de reset para fora, junto aos outros (estrutura final: Tabela → Dialog Criar → Dialog Editar → Dialog Reset Senha → AlertDialog Desativar).

### 2b. Capacidades de cada papel (já enforced via RLS no banco)

| Recurso | Admin | Staff |
|---|---|---|
| Equipamentos (ver/criar/editar) | Todos os setores | **Apenas do próprio setor** |
| Equipamentos (excluir) | Sim | Não |
| Ordens de Serviço (ver/criar/editar) | Todas | **Apenas do próprio setor** |
| Ordens (excluir) | Sim | Não |
| Movimentação de estoque | Tudo | Ver/criar do próprio setor |
| Manutenção | Tudo | Ver/criar/editar do próprio setor |
| Usuários | Criar/editar/ativar/desativar/reset senha | Sem acesso à página |
| Setores | Criar/editar/excluir | Apenas visualizar |
| Relatórios | Acesso completo | Sem acesso |

**Ação:** adicionar uma seção "Permissões" no topo da página de Usuários (visível só para admin) com este resumo, para que o admin entenda o que cada staff pode fazer ao designar o papel.

---

## 3. Equipamentos — flexibilizar cadastro

### 3a. Setor com opção "Outro" (criar novo na hora)
- Adicionar `SelectItem value="__novo__">+ Criar novo setor…"` ao select de Setor no formulário de Novo/Editar Equipamento.
- Ao selecionar, abrir um mini-dialog inline pedindo o nome do novo setor → insere em `setores` (admin only via RLS) → seleciona automaticamente o setor recém-criado.
- Para staff, esconder a opção "+ Criar novo setor" (RLS impede insert).

### 3b. Categoria livre
- Já há `<Input list="categorias-list">` com presets via datalist, então o usuário **já pode digitar qualquer categoria**. Vou apenas remover a restrição `disabled={!form.setor_id}` quando não há presets, e exibir um helper text "Digite a categoria livremente — usada para agrupar relatórios".

### 3c. Campos extras dinâmicos (descrições adicionais definidas pelo usuário)
- No formulário, adicionar uma seção "**Campos personalizados**" com botão "+ Adicionar campo" abaixo das Especificações Técnicas.
- Cada campo personalizado tem `{ label, valor }` e é salvo dentro de `especificacoes` no jsonb (já existente, sem migração).
- Renderizar esses campos no `EquipDetailsDrawer` automaticamente (toda chave em `especificacoes` que não pertence aos `getSpecFields` predefinidos vira linha da ficha técnica).

### 3d. Voltagem, peso etc. como campos sempre visíveis
- Adicionar ao bloco fixo do formulário (não mais dependente de categoria) os campos:
  - **Voltagem** (select: 110V / 220V / Bivolt / 12V DC / Outro)
  - **Peso (kg)** (number)
  - **Dimensões (CxLxA cm)** (text livre)
  - **Potência (W)** (number) — só se categoria não for "microfone/cabo/acessório"
- Salvar dentro de `especificacoes.voltagem`, `especificacoes.peso_kg`, `especificacoes.dimensoes`, `especificacoes.potencia_w`.
- Exibir no `EquipDetailsDrawer`.

### 3e. Descrição obrigatória
- Tornar o campo "Observações" obrigatório (rotular como "Descrição *") OU adicionar campo novo "Descrição *" separado das observações. Vou usar a 2ª opção: novo campo `descricao` (texto livre obrigatório) salvo em `especificacoes.descricao` (sem migração).
- Validação no submit: bloquear se vazio.

---

## 4. Ordens de Serviço — baixa, conferência via app

### 4a. Onde está a baixa hoje
Existe sim! Botão de seta verde (ícone `RotateCcw`) na coluna Ações de cada ordem (linhas 216–220 de `OrdensServico.tsx`). Ele chama `useRetornarOrdem`, que: marca a OS como `retornado`, devolve todos equipamentos para `disponivel`, e registra movimentação. Mas é pouco visível.

**Ação — tornar a baixa explícita:**
- Renomear o botão e adicionar texto "Dar baixa" com `<Button>` (não icon-only) quando a ordem está aberta/em_andamento.
- Antes de dar baixa, abrir um **dialog de conferência de retorno** mostrando a lista de equipamentos da OS com:
  - Checkbox "Devolvido" para cada item (default marcado).
  - Select de estado de conservação no retorno (bom / regular / danificado).
  - Campo de observação por item.
  - Se algum item for marcado como "danificado", o equipamento volta com status `danificado` em vez de `disponivel`.
- Só após confirmar a conferência é que a movimentação de retorno é registrada.

### 4b. Conferência de chegada no local via link público (app/QR)
Esta é a parte nova e maior. Plano:

#### Banco (migração)
Nova tabela `conferencias_chegada`:
```
id uuid pk
ordem_id uuid not null  (referencia ordens_servico)
token text unique not null  (hash gerado, usado na URL pública)
conferente_nome text  (preenchido por quem confere no local)
status text default 'pendente'  ('pendente' | 'em_conferencia' | 'concluida')
created_at, updated_at timestamps
```

Nova tabela `conferencia_itens`:
```
id uuid pk
conferencia_id uuid not null
equipamento_id uuid not null
conferido boolean default false
metodo_conferencia text  ('manual' | 'codigo' | 'qrcode' | 'codbarras')
observacao text
conferido_em timestamptz
```

**RLS:**
- `conferencias_chegada` e `conferencia_itens`: SELECT/UPDATE permitidos para `anon` **somente quando o request traz o token correto**. Implementação prática: criar policies usando funções security definer que recebem o token, ou expor as operações via Edge Function pública que valida o token.
- Decisão: usar **Edge Functions públicas** (mais seguro): `conferencia-get?token=...` (lê os dados), `conferencia-mark` (marca um item conferido). Tabelas ficam fechadas para anon.

#### Geração da OS
- Ao criar a ordem, gerar automaticamente uma `conferencia_chegada` com token aleatório (`crypto.randomUUID() + slug`).
- Na tela da OS (view e PDF), mostrar:
  - URL curta `/conferencia/<token>`
  - **QR Code** dessa URL (já temos lib qrcode no projeto via `QrLabelDialog`).
- Botão "Compartilhar link" (copia para clipboard / Web Share API) e "Imprimir QR".

#### Página pública `/conferencia/:token`
- Rota **fora** do `ProtectedRoute`, sem auth.
- Ao abrir:
  1. Pede **Nome do conferente** (input simples).
  2. Confirma o **Setor** da OS (read-only, vem do banco) — sem necessidade de "escolher", já está vinculado à OS.
  3. Lista os equipamentos da OS com:
     - Nome, marca/modelo, código de barras, nº de série.
     - Botão grande "**Conferir**" por item.
     - Quando clica, marca como conferido (verde, com hora).
- Acima da lista, três modos de conferência rápida:
  - **Digitar código** (input + botão OK): aceita id, nº série, código de barras, nº patrimônio.
  - **Ler QR Code** (abre `ScannerDialog` já existente).
  - **Ler código de barras** (mesmo scanner, já suporta EAN/Code128).
- Ao escanear/digitar, encontra o item correspondente na OS e marca como conferido. Se o código não pertence à OS, mostra erro "Equipamento X não faz parte desta ordem".
- Barra de progresso "8/12 conferidos".
- Botão final "**Finalizar conferência**" → marca `conferencia.status = 'concluida'`, opcionalmente atualiza a OS para `em_andamento` e registra observação.

#### Edge Functions (3 novas, públicas, sem JWT)
- `conferencia-get`: GET com `?token=...` → retorna dados da OS (cliente, local, data) + lista de equipamentos + estado de cada item.
- `conferencia-update-conferente`: POST com `{token, nome}` → grava `conferente_nome`, muda status para `em_conferencia`.
- `conferencia-mark-item`: POST com `{token, equipamento_id|codigo, metodo, observacao?}` → marca item conferido, valida se pertence à OS.
- `conferencia-finalizar`: POST com `{token}` → marca `concluida` e atualiza OS para `em_andamento`.

Todas validam o token contra a tabela usando service role (sem expor a tabela).

#### Visualização para o admin/staff
- Na visualização da OS, adicionar aba/seção "**Conferência de chegada**" mostrando:
  - Status (Pendente / Em conferência por <Nome> / Concluída em <data>).
  - Lista de itens com check verde + método (QR/código/manual) + horário.
  - Link `/conferencia/<token>` + botão "Ver QR".

---

## Resumo de arquivos

**Migrações (1):**
- Criar `conferencias_chegada` e `conferencia_itens` + RLS (deny all para anon; admin/staff veem suas OS via security definer).

**Edge Functions (4):**
- `supabase/functions/conferencia-get/index.ts`
- `supabase/functions/conferencia-update-conferente/index.ts`
- `supabase/functions/conferencia-mark-item/index.ts`
- `supabase/functions/conferencia-finalizar/index.ts`

**Frontend:**
- `src/pages/Usuarios.tsx` — corrigir bug JSX + seção de permissões.
- `src/pages/Setup.tsx` — UX já ok, sem alteração.
- `src/pages/Equipamentos.tsx` — opção "+ Criar novo setor", campo descrição obrigatória, voltagem/peso/dimensões fixos, campos personalizados dinâmicos.
- `src/components/EquipDetailsDrawer.tsx` — exibir extras de `especificacoes` automaticamente.
- `src/pages/OrdensServico.tsx` — botão "Dar baixa" com dialog de conferência de retorno; aba "Conferência de chegada" com QR/link.
- `src/hooks/useOrdens.ts` — gerar conferência ao criar ordem; ajustar `useRetornarOrdem` para receber payload com itens devolvidos/danificados.
- `src/pages/ConferenciaPublica.tsx` — **nova** página pública `/conferencia/:token`.
- `src/App.tsx` — adicionar rota pública `/conferencia/:token`.

---

## Pontos que preciso confirmar antes de codar

1. **Setor "Outro" no cadastro de equipamento:** ok criar novo setor inline (apenas admin) ou prefere apenas permitir digitar livre num input (sem virar registro reaproveitável)?
2. **Campo "Descrição" obrigatório:** novo campo dedicado, ou apenas tornar "Observações" obrigatório?
3. **Conferência de chegada:** ok que cada OS gere automaticamente um link público com token (ninguém precisa logar para conferir)? Risco: quem tiver o link consegue ver a lista de equipamentos da OS. Isso é aceitável para o caso de uso?
4. **Baixa com dano:** quando um item volta marcado como "danificado", devo abrir automaticamente uma OS de Manutenção, ou apenas mudar o status do equipamento?

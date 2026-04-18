
## O que vou implementar

### 1. Admin cadastra novos usuários
- Botão "Novo Usuário" em `/usuarios` (somente admin)
- Formulário: nome, email, senha, setor, role (admin/staff)
- Edge Function `create-user` usando `SUPABASE_SERVICE_ROLE_KEY`:
  - Valida que quem chama é admin (`has_role`)
  - Cria usuário via `auth.admin.createUser` com `email_confirm: true`
  - Atualiza `profiles.setor_id` e insere em `user_roles`

### 2. Adicionar equipamentos
- O formulário já existe em `Equipamentos.tsx`. Vou revisar e garantir validação com zod e melhor UX.

### 3. Novos campos de equipamento
- Migração ALTER TABLE `equipamentos`:
  - `codigo_barras text` (lido pelo scanner 1D)
  - `marca text`, `modelo text`, `categoria text`
  - QR usa o próprio `id` como payload (não precisa coluna)
- Atualizar formulário e tabela para exibir/editar esses campos
- Botão "Imprimir etiqueta" mostra QR code (lib `qrcode.react`) com nome + número de série

### 4. Leitor de QR code e código de barras
- Lib: `html5-qrcode` (suporta QR + EAN/Code128, usa câmera)
- Componente reutilizável `<ScannerDialog onScan={...}>`:
  - Abre câmera em fullscreen (mobile-first)
  - Campo de input manual como fallback
- Dois pontos de uso:
  - **Equipamentos**: botão "Escanear" → busca por `id` → `codigo_barras` → `numero_serie` → abre detalhes
  - **Ordem de Serviço (form)**: botão "Escanear" → adiciona o equipamento à lista da OS

### Detalhes técnicos
- Migração SQL: `ALTER TABLE equipamentos ADD COLUMN codigo_barras text, ADD COLUMN marca text, ADD COLUMN modelo text, ADD COLUMN categoria text;` + índice em `codigo_barras`
- Dependências novas: `html5-qrcode`, `qrcode.react`
- Edge function `create-user` em `supabase/functions/create-user/index.ts` com CORS e validação zod
- Atualizar `useEquipamentos.ts` para incluir os novos campos no insert/update
- Atualizar `Usuarios.tsx` com dialog de criação chamando `supabase.functions.invoke('create-user', ...)`

### Estrutura
```text
Equipamentos page
├── [+ Novo] (já existe, ampliado com novos campos)
├── [Escanear] → ScannerDialog → abre equipamento
└── linha → [Etiqueta QR] → modal imprimível

Ordens de Serviço (form)
└── [Escanear] → ScannerDialog → adiciona à lista

Usuários page (admin)
└── [+ Novo Usuário] → form → edge function create-user
```

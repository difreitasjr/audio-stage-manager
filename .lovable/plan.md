## Continuar implementação SaaS com Cakto (migration já aplicada ✅)

A migration do banco já foi feita com sucesso (campos de assinatura em `empresas`, tabela `pagamentos`, função `empresa_tem_acesso`, trigger de trial automático). Falta agora:

### 1. Edge function `cakto-webhook` (`supabase/functions/cakto-webhook/index.ts`)
- Recebe POST da Cakto, valida `CAKTO_WEBHOOK_SECRET` (header ou query string)
- Detecta plano (mensal/semestral/anual) pelo nome do produto ou valor
- Insere registro em `pagamentos` (idempotente via `cakto_event_id`)
- Atualiza `empresas.status_assinatura`:
  - `approved/paid/active/renewed` → `ativa` + define `assinatura_proxima_cobranca`
  - `refused/failed/chargeback` → `atrasada`
  - `cancel/expired/refund` → `cancelada`
- Adiciona `[functions.cakto-webhook] verify_jwt = false` no `config.toml`

### 2. Hook `useAssinatura` (`src/hooks/useAssinatura.ts`)
Lê empresa do usuário e calcula: `diasRestantesTrial`, `temAcesso`, `bannerStatus` (`ok` / `trial` / `trial-aviso` / `trial-expirado` / `atrasada` / `cancelada`).

### 3. Banner no `AppLayout`
Faixa colorida no topo (azul/amarelo/laranja/vermelho) conforme status, com botão "Assinar agora" → `/assinatura`. **Não bloqueia** nenhuma funcionalidade.

### 4. Página `/assinatura` (`src/pages/Assinatura.tsx`)
- Card com plano atual + status + dias restantes / próxima cobrança
- 3 cards de planos (Mensal R$ 149 / Semestral R$ 759 / Anual R$ 1.199 — destaque no Anual)
- Cada card abre o link da Cakto em nova aba, anexando `?external_id={empresa_id}` para o webhook identificar
- Histórico de pagamentos (tabela)
- Os links da Cakto ficam em constantes no topo do arquivo — você cola depois de criar os produtos

### 5. Atualizar `App.tsx` para incluir rota `/assinatura`

### 6. Landing page (`src/pages/Landing.tsx`)
Adicionar seção **Preços** com 3 cards e CTA "Começar 7 dias grátis" → `/cadastro`.

### 7. Adicionar item "Assinatura" no menu lateral (apenas para admin)

### 8. Pedir o secret `CAKTO_WEBHOOK_SECRET`
Após implementar, vou abrir o formulário de secret. Você cola o valor que gerar no painel Cakto.

### 9. Entregar instruções finais
- URL do webhook: `https://czwbbvyzjpcldzvzjwtz.supabase.co/functions/v1/cakto-webhook`
- Como configurar no painel Cakto (campo `external_id` = empresa_id, eventos a habilitar)
- Onde colar os 3 links de checkout no código

### Fora do escopo desta implementação
- Cron diário de marcar `atrasada` automaticamente (não é necessário — a Cakto avisa via webhook quando o pagamento falha)
- Termos de Uso/Política de Privacidade (texto jurídico — você cuida)

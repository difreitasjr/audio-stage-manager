## Objetivo
SaaS pronto para vender com checkout via **Cakto**, 3 ciclos (mensal/semestral/anual), 7 dias de trial grátis e **avisos visuais de inadimplência (sem bloqueio de acesso)**.

## Preços
| Plano | Valor |
|---|---|
| Mensal | R$ 149/mês |
| Semestral | R$ 759 (~15% off) |
| Anual | R$ 1.199 (~33% off) |

Trial: **7 dias grátis** sem cartão.

## Como vai funcionar a Cakto
A Cakto é uma plataforma brasileira de checkout (cartão, Pix, boleto). O fluxo é:

1. Você cria os 3 produtos no painel da Cakto (Mensal/Semestral/Anual) e gera 3 **links de checkout**.
2. Configura o **Pixel/Webhook** da Cakto apontando para nosso endpoint, para receber notificações de pagamento aprovado, recusado, estornado, etc.
3. No nosso sistema, os botões "Assinar" abrem o link de checkout da Cakto correspondente, passando o `empresa_id` no campo de identificação externa (`external_id` ou metadata).
4. Quando a Cakto confirma pagamento, o webhook atualiza `empresas.status_assinatura = 'ativa'`.

## O que será construído

### 1. Banco de dados
Adicionar à tabela `empresas`:
- `plano` ('trial' | 'mensal' | 'semestral' | 'anual')
- `status_assinatura` ('trial' | 'ativa' | 'atrasada' | 'cancelada')
- `trial_inicio`, `trial_fim`
- `assinatura_inicio`, `assinatura_proxima_cobranca`
- `cakto_customer_id`, `cakto_subscription_id`, `cakto_last_event`

Nova tabela `pagamentos`:
- Histórico de transações vindas da Cakto (id, valor, status, método, data, raw_payload)

### 2. Edge function `cakto-webhook`
- Recebe POST da Cakto
- Valida assinatura/secret do webhook
- Atualiza `empresas.status_assinatura` e grava em `pagamentos`
- Eventos tratados: `payment.approved`, `payment.refused`, `subscription.canceled`, `subscription.renewed`, `chargeback`

### 3. Tela "Minha Assinatura" (`/assinatura`)
- Plano atual + status (trial / ativa / atrasada)
- Dias restantes (no trial) ou próxima cobrança (assinatura ativa)
- 3 cards de plano com botão **"Assinar agora"** → abre link da Cakto em nova aba
- Histórico de pagamentos (da tabela `pagamentos`)
- Suporte: link/WhatsApp para falar com você (admin do SaaS)

### 4. Avisos visuais (SEM bloqueio)
Banner no topo do `AppLayout` com cores diferentes:
- **Trial ativo (verde/azul):** "Você está no período de teste — faltam X dias. [Assinar agora]"
- **Trial expirando (amarelo, últimos 2 dias):** "Seu teste termina em X dias!"
- **Trial expirado / sem assinatura (laranja):** "Seu teste expirou. Assine para continuar com tranquilidade. [Ver planos]"
- **Pagamento atrasado (vermelho):** "⚠️ Identificamos um problema com seu pagamento. Por favor, regularize. [Ir para assinatura]"

O sistema **continua funcionando normalmente** em todos os casos — apenas o banner muda. O usuário consegue cadastrar equipamentos, criar OS, etc., mesmo inadimplente.

### 5. Fluxo de cadastro novo (`Cadastro.tsx`)
1. Cliente preenche dados da empresa + admin
2. Conta criada com `status_assinatura = 'trial'` e `trial_fim = hoje + 7 dias`
3. Entra direto no sistema
4. Vê banner verde de trial e pode assinar a qualquer momento

### 6. Landing page
Adicionar seção **Preços** com os 3 planos lado a lado, destaque visual no Anual ("Mais vendido — economize 33%"), CTA "Começar 7 dias grátis".

### 7. Configuração da Cakto (você faz no painel deles)
Vou te entregar:
- A **URL do webhook** para colar no painel Cakto
- O **nome do campo** que você precisa configurar no checkout para passar o `empresa_id` (chamado `external_id` ou `metadata.empresa_id`)
- Onde colar os 3 **links de checkout** (Mensal/Semestral/Anual) na tela de assinatura

Você precisará me passar 1 secret (configuro com você):
- `CAKTO_WEBHOOK_SECRET` — secret de validação do webhook (gerado no painel da Cakto)

## Detalhes técnicos
- **Multi-tenant já está pronto** ✅ — não mexemos.
- **Sem bloqueio de acesso**: nenhum middleware corta funcionalidade. A função `empresa_tem_acesso()` existe apenas para o frontend exibir o banner correto.
- **Webhook idempotente**: usa `cakto_event_id` único para não processar o mesmo evento 2x.
- **Trial automático**: trigger no banco preenche `trial_fim = trial_inicio + 7 dias` ao criar empresa.
- **Cron diário** (opcional, edge function agendada): atualiza `status_assinatura` para `'atrasada'` quando `assinatura_proxima_cobranca < hoje`.

## Itens fora do código (você cuida)
- Criar conta Cakto e os 3 produtos (Mensal/Semestral/Anual) com cobrança recorrente
- Termos de Uso e Política de Privacidade (LGPD)
- Domínio próprio
- CNPJ para nota fiscal

## Ordem de execução
1. Migration (campos de assinatura em `empresas` + tabela `pagamentos` + função `empresa_tem_acesso`)
2. Edge function `cakto-webhook`
3. Tela `/assinatura` com 3 planos e histórico
4. Banner de status no `AppLayout`
5. Atualizar `Cadastro.tsx` para criar trial de 7 dias
6. Atualizar Landing com seção de preços
7. Te entregar URL do webhook + instruções para configurar no painel Cakto

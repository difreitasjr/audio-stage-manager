

## Visão geral do que melhorar

Olhando o app inteiro, identifiquei pontos de melhoria divididos em 3 níveis. Vou propor implementar o **Nível 1 (foco do seu pedido)** agora e listar o restante como próximos passos.

---

## Nível 1 — Detalhes e características dos equipamentos (foco)

Hoje o cadastro de equipamento tem só campos genéricos (nome, marca, modelo, série). Para audiovisual isso é pouco — um projetor sem saber lumens/resolução, ou um microfone sem saber se é dinâmico/condensador, vira problema na hora de montar a OS.

### A. Campos novos por categoria (especificações técnicas)

Adicionar uma coluna `especificacoes` (JSONB) na tabela `equipamentos` para guardar atributos flexíveis por tipo. Sem precisar criar 30 colunas novas.

Schema sugerido por categoria:

| Categoria | Campos |
|---|---|
| Projetor | Lumens, Resolução, Tecnologia (DLP/LCD/LASER), Lente, Horas de lâmpada |
| Painel LED | Pitch (P2.6/P3.9...), Resolução módulo, Quantidade de módulos, Indoor/Outdoor |
| Câmera | Sensor, Resolução máx, Tipo de lente/montagem, SDI/HDMI |
| Microfone | Tipo (dinâmico/condensador/lapela), Padrão polar, Conector, Frequência (sem fio) |
| Mesa de Som | Canais, Tipo (digital/analógica), Saídas |
| Caixa Acústica | Potência (W), Tipo (line array/PA/monitor), Ativa/Passiva |
| Moving/Refletor | Potência (W), Tipo (LED/lâmpada), Ângulo, DMX |
| Mesa de Luz | Universos DMX, Marca/Software |
| Encoder/Switcher Stream | Entradas, Saídas, Resolução máx, Bitrate |

### B. Campos universais novos
- **Foto do equipamento** (1 imagem, storage bucket `equipamento-fotos`) — útil pra identificar visualmente
- **Estado de conservação** (Novo / Bom / Regular / Crítico) — separado de "status"
- **Nº de patrimônio** (separado de série) — empresas grandes usam ambos
- **Data da última revisão** + **próxima revisão prevista**
- **Acessórios inclusos** (texto livre — ex: "case + cabo de força + controle")

### C. Visualização (Equipamentos.tsx)
- Botão "Ver detalhes" abre um drawer lateral com **ficha técnica completa** + foto + histórico (últimas OS + últimas manutenções)
- No formulário, uma seção **"Especificações"** que renderiza dinamicamente os campos da categoria selecionada
- Filtro adicional na listagem: por **estado de conservação**

---

## Nível 2 — Melhorias gerais de qualidade (não vou fazer agora, só listar)

- **Manutenção sem opções**: o select de equipamento na tela de Manutenção mostra todos sem filtrar por setor/status; falta filtro de busca
- **Movimentação não registra automaticamente**: hoje a tabela `movimentacao_estoque` existe mas nada grava nela. Deveria registrar saída/retorno sempre que uma OS muda de status
- **Dashboard sem alertas**: não destaca OS atrasadas nem manutenções >30 dias
- **Sem upload de anexos na OS**: nota fiscal, contrato, foto do evento

## Nível 3 — UX e polimento

- Tema escuro (já tem `next-themes` instalado, falta toggle)
- Atalhos de teclado (Ctrl+K busca global, N nova OS)
- Confirmação de exclusão com dialog bonito (hoje usa `confirm()` nativo do browser)

---

## Implementação técnica do Nível 1

1. **Migração SQL**:
   - `ALTER TABLE equipamentos ADD COLUMN especificacoes JSONB DEFAULT '{}'::jsonb`
   - `ADD COLUMN foto_url TEXT`
   - `ADD COLUMN estado_conservacao TEXT DEFAULT 'bom'` (novo/bom/regular/critico)
   - `ADD COLUMN numero_patrimonio TEXT`
   - `ADD COLUMN data_ultima_revisao DATE`
   - `ADD COLUMN proxima_revisao DATE`
   - `ADD COLUMN acessorios TEXT`
   - Criar bucket `equipamento-fotos` (público) com RLS de upload restrita a authenticated

2. **`src/lib/equipSpecs.ts`** (novo): mapa `categoria → array de campos { key, label, type, options? }` para renderizar formulário dinâmico

3. **`src/pages/Equipamentos.tsx`**:
   - Form expandido: nova seção "Especificações Técnicas" (dinâmica) + "Conservação e Manutenção" + upload de foto
   - Novo componente `EquipDetailsDrawer` com ficha completa, foto, especificações renderizadas, histórico de OS e manutenções
   - Botão olho 👁 na tabela abre o drawer

4. **`src/hooks/useEquipamentos.ts`**: incluir os novos campos no tipo `EquipFields` e nas mutations

5. **Histórico do equipamento** (no drawer): query que junta `ordem_equipamentos` (com `ordens_servico`) + `manutencao` para o `equipamento_id`

Sem mudanças em RLS — herda as políticas existentes da tabela `equipamentos`.

---

## Pergunta antes de implementar

Quer que eu faça **tudo do Nível 1** numa tacada só, ou prefere fatiar? Sugestão de fatias se preferir incremental:
- **Fatia A**: campos universais (foto, conservação, patrimônio, revisão, acessórios) + drawer de detalhes com histórico
- **Fatia B**: especificações técnicas dinâmicas por categoria

Me confirma "tudo" ou "fatia A primeiro" que eu sigo.


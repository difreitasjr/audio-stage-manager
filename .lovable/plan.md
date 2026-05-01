## Objetivo

Incluir no PDF da Ordem de Serviço um **QR Code** apontando para o link público de conferência de chegada (`/conferencia/{token}`), para que quem receber a impressão possa escanear e abrir a conferência sem precisar de login.

## Como vai funcionar

1. Ao gerar o PDF da OS, o sistema busca a `conferencia_chegada` vinculada à ordem.
2. Se existir token de conferência, o PDF mostra na área de assinaturas/rodapé:
   - Um **QR Code** (≈35x35mm) com o link `https://<dominio>/conferencia/{token}`
   - Texto: "Escaneie para conferência de chegada"
   - O link em texto pequeno (fallback caso a impressão fique ruim)
3. Se a OS ainda não tiver conferência criada, o PDF é gerado normalmente sem o QR (comportamento atual).

## Mudanças técnicas

### `src/lib/ordemPdf.ts`
- Tornar `gerarOrdemPdf` assíncrona (`async`) para permitir gerar a imagem do QR.
- Aceitar opcionalmente um `conferenciaUrl` no objeto `ordem` (ou parâmetro extra).
- Gerar o QR como dataURL usando a lib `qrcode` (já implícita; se não estiver, usar `qrcode` que é leve — verificar package.json; se ausente, adicionar) e inserir via `doc.addImage()`.
- Posicionar o QR no canto inferior esquerdo, acima da linha de assinatura, sem sobrepor o conteúdo. Ajustar o cálculo de `signY` para reservar espaço.

### `src/pages/OrdensServico.tsx` (e qualquer outro local que chame `gerarOrdemPdf`)
- Antes de chamar `gerarOrdemPdf(ordem)`, buscar o token da conferência:
  ```ts
  const { data: conf } = await supabase
    .from("conferencias_chegada")
    .select("token")
    .eq("ordem_id", ordem.id)
    .maybeSingle();
  const conferenciaUrl = conf?.token
    ? `${window.location.origin}/conferencia/${conf.token}`
    : null;
  await gerarOrdemPdf({ ...ordem, conferenciaUrl });
  ```
- Adicionar `await` na chamada (botão de gerar PDF).

### Dependência
- Verificar se `qrcode` está em `package.json`. O projeto já usa `qrcode.react` (componente React), mas para gerar dataURL no Node/browser sem render, precisamos do pacote `qrcode`. Se ausente, adicionar `qrcode` (e `@types/qrcode`).

## Layout do PDF (área inferior)

```text
┌──────────────────────────────────────────────────────────┐
│ [QR]   Conferência de chegada                            │
│ 35mm   Escaneie para receber os equipamentos             │
│        https://.../conferencia/abc123...                 │
│                                                          │
│  ____________________        ____________________        │
│  Responsável (Entrega)       Cliente (Recebimento)       │
└──────────────────────────────────────────────────────────┘
```

## Arquivos afetados
- `src/lib/ordemPdf.ts` (modificado)
- `src/pages/OrdensServico.tsx` (chamada do PDF)
- `package.json` (possivelmente adicionar `qrcode`)

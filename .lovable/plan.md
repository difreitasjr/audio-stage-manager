
Atualizar os PRESETS de equipamentos em `src/pages/Equipamentos.tsx` para refletir o foco em **eventos corporativos** (palestras, congressos, conferências, lançamentos, treinamentos).

### Novos presets por setor

**Vídeo**
- Projetor: Epson PowerLite 5000lm, Epson PowerLite 7000lm, Epson Pro L1100U, Optoma ZU720, Panasonic PT-RZ970
- Tela de Projeção: Tela Tripé 100", Tela Retrátil 120", Tela Fast-Fold 200", Tela Fast-Fold 300"
- Painel de LED: Painel LED P2.6 Indoor, Painel LED P3.9 Indoor/Outdoor, Painel LED P4.8 Outdoor, Módulo LED Absen
- Monitor/TV: TV LED 55", TV LED 65", TV LED 75", Monitor de Referência 24"
- Câmera: Sony PXW-Z150, Panasonic AG-CX10, Blackmagic Pocket 6K, PTZ Sony SRG-X120
- Switcher/Processador: Blackmagic ATEM Mini Pro, Roland V-1HD, Processador Novastar MCTRL4K
- Cabos e Conversores: Cabo HDMI 10m, Cabo HDMI 20m, Cabo SDI 30m, Conversor HDMI-SDI, Fibra Óptica HDMI 50m

**Som**
- Microfone: Shure SM58, Shure Beta 58A, Sennheiser e835, Lapela Sennheiser EW112, Headset Sennheiser HSP4, Microfone Gooseneck
- Sistema Sem Fio: Shure BLX24, Shure QLX-D, Sennheiser EW100 G4, Sennheiser EW500
- Mesa de Som: Behringer X32, Yamaha QL5, Allen & Heath SQ-6, Soundcraft Ui24R
- Caixa Acústica: Line Array RCF HDL 20-A, JBL VRX932, EV ETX-15P, Subwoofer JBL SRX828SP
- Monitor de Retorno: Monitor JBL EON612, Monitor de Palco Behringer
- Acessórios: Pedestal de Microfone, Direct Box Behringer DI100, Cabo XLR 10m, Multicabo 16 vias

**Luz**
- Iluminação de Palco: Moving Head Beam 230, Moving Head Spot 350, Refletor LED Par 64, Fresnel LED 200W
- Iluminação Cênica: Elipsoidal LED 26°, Elipsoidal LED 36°, Setlight LED 1000W
- Mesa de Luz: Mesa Avolites Quartz, Mesa GrandMA3 OnPC, Console Chamsys MagicQ
- Estrutura: Treliça Q30 3m, Box Truss 2m, Talha Manual 1T, Base de Solo
- Efeitos: Máquina de Fumaça 1500W, Máquina de Haze, Strobo LED

**Streaming**
- Câmera de Streaming: Logitech BRIO 4K, Sony ZV-E10, Câmera PTZ OBSBOT Tail Air, Webcam Logitech C920
- Captura/Encoder: Elgato Cam Link 4K, Blackmagic Web Presenter HD, Encoder Teradek VidiU Go
- Switcher de Streaming: ATEM Mini Pro ISO, ATEM Mini Extreme, vMix PC Dedicado
- Áudio para Streaming: Interface Focusrite Scarlett 2i2, RodeCaster Pro II, Microfone USB Blue Yeti
- Conectividade: Roteador 4G/5G Bonding, Switch Gigabit 8 portas, Cabo Ethernet Cat6 30m
- Iluminação Stream: Ring Light 18", Painel LED Godox SL60, Softbox 60x60

### Implementação
- Substituir o objeto `PRESETS` em `src/pages/Equipamentos.tsx` mantendo a mesma estrutura `Record<setorKey, Record<categoria, string[]>>`.
- Manter chaves de setor minúsculas (`som`, `luz`, `video`, `streaming`) para o lookup já existente via `nome.toLowerCase()`.
- Nenhuma mudança em banco, RLS, ou outros componentes.

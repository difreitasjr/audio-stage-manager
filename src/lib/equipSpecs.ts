// Mapa de especificações técnicas por categoria de equipamento.
// Usado para renderizar campos dinâmicos no formulário de Equipamentos
// e exibir a ficha técnica no drawer de detalhes.

export type SpecField = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  suffix?: string;
};

// A chave de busca normaliza a categoria (lowercase, sem acentos) e tenta
// match parcial contra as palavras-chave abaixo.
const SPEC_MAP: Array<{ match: RegExp; fields: SpecField[] }> = [
  {
    match: /projetor/i,
    fields: [
      { key: "lumens", label: "Lumens (ANSI)", type: "number", suffix: "lm" },
      { key: "resolucao", label: "Resolução", type: "select", options: ["XGA", "WXGA", "Full HD", "WUXGA", "4K"] },
      { key: "tecnologia", label: "Tecnologia", type: "select", options: ["DLP", "3LCD", "LCD", "LASER"] },
      { key: "lente", label: "Lente / Throw", type: "text" },
      { key: "horas_lampada", label: "Horas de lâmpada", type: "number", suffix: "h" },
    ],
  },
  {
    match: /led|painel/i,
    fields: [
      { key: "pitch", label: "Pitch", type: "select", options: ["P1.5", "P1.9", "P2.6", "P2.9", "P3.9", "P4.8", "P5.9"] },
      { key: "resolucao_modulo", label: "Resolução por módulo", type: "text" },
      { key: "qtd_modulos", label: "Qtd. de módulos", type: "number" },
      { key: "uso", label: "Uso", type: "select", options: ["Indoor", "Outdoor", "Indoor/Outdoor"] },
    ],
  },
  {
    match: /câmera|camera/i,
    fields: [
      { key: "sensor", label: "Sensor", type: "text" },
      { key: "resolucao_max", label: "Resolução máxima", type: "select", options: ["1080p", "4K", "6K", "8K"] },
      { key: "lente", label: "Tipo / Montagem de lente", type: "text" },
      { key: "saidas", label: "Saídas", type: "select", options: ["HDMI", "SDI", "HDMI + SDI", "USB", "NDI"] },
    ],
  },
  {
    match: /microfone|sem fio|lapela|headset/i,
    fields: [
      { key: "tipo", label: "Tipo", type: "select", options: ["Dinâmico", "Condensador", "Lapela", "Headset", "Gooseneck"] },
      { key: "padrao_polar", label: "Padrão polar", type: "select", options: ["Cardióide", "Supercardióide", "Omnidirecional", "Bidirecional"] },
      { key: "conector", label: "Conector", type: "select", options: ["XLR", "P10", "Mini-XLR", "USB", "Sem fio UHF", "Sem fio 2.4GHz"] },
      { key: "frequencia", label: "Frequência (sem fio)", type: "text", suffix: "MHz" },
    ],
  },
  {
    match: /mesa de som/i,
    fields: [
      { key: "canais", label: "Canais", type: "number" },
      { key: "tipo", label: "Tipo", type: "select", options: ["Digital", "Analógica"] },
      { key: "saidas", label: "Saídas", type: "number" },
    ],
  },
  {
    match: /caixa|line array|monitor de retorno|subwoofer/i,
    fields: [
      { key: "potencia", label: "Potência", type: "number", suffix: "W" },
      { key: "tipo", label: "Tipo", type: "select", options: ["Line Array", "PA", "Monitor", "Subwoofer"] },
      { key: "alimentacao", label: "Alimentação", type: "select", options: ["Ativa", "Passiva"] },
    ],
  },
  {
    match: /moving|refletor|fresnel|elipsoidal|setlight|par 64/i,
    fields: [
      { key: "potencia", label: "Potência", type: "number", suffix: "W" },
      { key: "fonte", label: "Fonte", type: "select", options: ["LED", "Lâmpada", "LASER"] },
      { key: "angulo", label: "Ângulo / Zoom", type: "text" },
      { key: "dmx", label: "Canais DMX", type: "number" },
    ],
  },
  {
    match: /mesa de luz|console.*chamsys|grandma|avolites/i,
    fields: [
      { key: "universos", label: "Universos DMX", type: "number" },
      { key: "software", label: "Software / Marca", type: "text" },
    ],
  },
  {
    match: /encoder|switcher|atem|vmix|web presenter/i,
    fields: [
      { key: "entradas", label: "Entradas", type: "number" },
      { key: "saidas", label: "Saídas", type: "number" },
      { key: "resolucao_max", label: "Resolução máxima", type: "select", options: ["1080p", "4K"] },
      { key: "bitrate", label: "Bitrate máx.", type: "text", suffix: "Mbps" },
    ],
  },
];

export function getSpecFields(categoria?: string | null): SpecField[] {
  if (!categoria) return [];
  for (const entry of SPEC_MAP) {
    if (entry.match.test(categoria)) return entry.fields;
  }
  return [];
}

export const ESTADO_CONSERVACAO_LABELS: Record<string, string> = {
  novo: "Novo",
  bom: "Bom",
  regular: "Regular",
  critico: "Crítico",
};

export const ESTADO_CONSERVACAO_COLORS: Record<string, string> = {
  novo: "bg-emerald-100 text-emerald-800",
  bom: "bg-blue-100 text-blue-800",
  regular: "bg-amber-100 text-amber-800",
  critico: "bg-red-100 text-red-800",
};

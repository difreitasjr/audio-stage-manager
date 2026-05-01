import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

export async function gerarOrdemPdf(ordem: any) {
  const doc = new jsPDF();
  const conferenciaUrl: string | null = ordem.conferenciaUrl || null;
  let qrDataUrl: string | null = null;
  if (conferenciaUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(conferenciaUrl, { margin: 1, width: 256 });
    } catch { /* ignore */ }
  }
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEM DE SERVIÇO", 14, 14);
  doc.setFontSize(11);
  doc.text(`Nº ${String(ordem.numero).padStart(5, "0")}`, pageW - 14, 14, { align: "right" });

  doc.setTextColor(0);
  y = 32;

  // Setor / status
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Setor: ${ordem.setores?.nome || "—"}`, 14, y);
  doc.text(`Status: ${ordem.status?.toUpperCase()}`, pageW - 14, y, { align: "right" });
  y += 8;

  // Datas
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    head: [["Data Saída", "Retorno Previsto", "Responsável"]],
    body: [[fmt(ordem.data_saida), fmt(ordem.data_retorno_prevista), ordem.responsavel_nome || "—"]],
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Cliente
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    head: [["Cliente", "Contato", "Local do Evento"]],
    body: [[ordem.cliente || "—", ordem.contato_cliente || "—", ordem.local_evento || "—"]],
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Descrição
  if (ordem.descricao_servico) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Descrição do Serviço:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(ordem.descricao_servico, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // Equipamentos
  const equipRows = (ordem.ordem_equipamentos || []).map((oe: any, i: number) => [
    i + 1,
    oe.quantidade || 1,
    oe.equipamentos?.nome || oe.equipamento_id,
  ]);
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 18, halign: "center" } },
    head: [["#", "Qtd", "Equipamento"]],
    body: equipRows.length ? equipRows : [["—", "—", "Nenhum equipamento"]],
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Checklist
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Checklist Pré-Entrega:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const chk = (b: boolean) => (b ? "[X]" : "[ ]");
  doc.text(`${chk(ordem.checklist_funciona)} Equipamento funcionando corretamente`, 14, y); y += 5;
  doc.text(`${chk(ordem.checklist_acessorios)} Todos os acessórios incluídos`, 14, y); y += 5;
  doc.text(`${chk(ordem.checklist_completo)} Kit completo e verificado`, 14, y); y += 8;

  // Observações
  if (ordem.observacoes) {
    doc.setFont("helvetica", "bold");
    doc.text("Observações:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(ordem.observacoes, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // QR de conferência (acima das assinaturas)
  const pageH = doc.internal.pageSize.getHeight();
  if (qrDataUrl && conferenciaUrl) {
    const qrSize = 32;
    const qrY = Math.max(y + 4, pageH - 78);
    doc.addImage(qrDataUrl, "PNG", 14, qrY, qrSize, qrSize);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Conferência de chegada", 14 + qrSize + 4, qrY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text("Escaneie o QR para abrir a conferência", 14 + qrSize + 4, qrY + 12);
    doc.text("(não requer login)", 14 + qrSize + 4, qrY + 17);
    doc.setFontSize(7);
    doc.setTextColor(120);
    const urlLines = doc.splitTextToSize(conferenciaUrl, pageW - (14 + qrSize + 4) - 14);
    doc.text(urlLines, 14 + qrSize + 4, qrY + 23);
    y = qrY + qrSize + 4;
  }

  // Assinaturas
  const signY = Math.max(y + 20, pageH - 40);
  const colW = (pageW - 28) / 2;
  doc.setDrawColor(0);
  doc.setTextColor(0);
  doc.line(14, signY, 14 + colW - 10, signY);
  doc.line(14 + colW + 10, signY, pageW - 14, signY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Responsável (Entrega)", 14 + (colW - 10) / 2, signY + 5, { align: "center" });
  doc.text("Cliente (Recebimento)", 14 + colW + 10 + (colW - 10) / 2, signY + 5, { align: "center" });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    pageW / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: "center" }
  );

  doc.save(`OS-${String(ordem.numero).padStart(5, "0")}-${ordem.cliente}.pdf`);
}

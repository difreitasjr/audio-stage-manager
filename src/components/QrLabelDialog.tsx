import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface QrLabelDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamento: any | null;
}

export function QrLabelDialog({ open, onOpenChange, equipamento }: QrLabelDialogProps) {
  if (!equipamento) return null;

  const handlePrint = () => {
    const node = document.getElementById("printable-label");
    if (!node) return;
    const w = window.open("", "_blank", "width=400,height=400");
    if (!w) return;
    w.document.write(`<html><head><title>Etiqueta</title><style>
      body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;margin:0;padding:20px}
      .label{text-align:center;border:1px dashed #999;padding:16px;border-radius:8px}
      .name{font-weight:600;margin-top:8px;font-size:14px}
      .meta{font-size:11px;color:#666;margin-top:2px}
    </style></head><body><div class="label">${node.innerHTML}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Etiqueta QR</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <div id="printable-label" className="text-center">
            <QRCodeSVG value={equipamento.id} size={180} level="M" includeMargin />
            <div className="name">{equipamento.nome}</div>
            {equipamento.numero_serie && <div className="meta">SN: {equipamento.numero_serie}</div>}
            {equipamento.codigo_barras && <div className="meta">CB: {equipamento.codigo_barras}</div>}
          </div>
          <Button onClick={handlePrint} className="w-full">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

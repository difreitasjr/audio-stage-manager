import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (code: string) => void;
  title?: string;
}

const REGION_ID = "qr-scanner-region";

export function ScannerDialog({ open, onOpenChange, onScan, title = "Escanear código" }: ScannerDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let cancelled = false;

    const start = async () => {
      try {
        // Wait for DOM
        await new Promise((r) => setTimeout(r, 100));
        if (cancelled) return;
        const html5 = new Html5Qrcode(REGION_ID, { verbose: false });
        scannerRef.current = html5;
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            onScan(decoded);
            stop();
            onOpenChange(false);
          },
          () => {}
        );
      } catch (e: any) {
        setError(e?.message || "Não foi possível acessar a câmera");
      }
    };

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          if (s.isScanning) await s.stop();
          await s.clear();
        } catch {}
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    onScan(manual.trim());
    setManual("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div id={REGION_ID} className="w-full rounded-lg overflow-hidden bg-muted aspect-square" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <form onSubmit={handleManual} className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ou digite o código manualmente</Label>
            <div className="flex gap-2">
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Cód. barras / Nº série / ID" />
              <Button type="submit" size="sm">OK</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

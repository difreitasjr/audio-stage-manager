import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function Manutencao() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: equipamentos = [] } = useEquipamentos();

  const { data: manutencoes = [], isLoading } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manutencao")
        .select("*, equipamentos(nome), profiles!manutencao_responsavel_id_fkey(nome)")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    equipamento_id: "", tipo_reparo: "", descricao: "", data_inicio: new Date().toISOString().split("T")[0],
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("manutencao").insert({
        equipamento_id: form.equipamento_id, tipo_reparo: form.tipo_reparo,
        descricao: form.descricao || undefined, responsavel_id: profile?.id,
        data_inicio: form.data_inicio,
      });
      if (error) throw error;
      await supabase.from("equipamentos").update({ status: "manutencao" }).eq("id", form.equipamento_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("Manutenção registrada!");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const concluirMut = useMutation({
    mutationFn: async (m: any) => {
      const { error } = await supabase.from("manutencao")
        .update({ data_conclusao: new Date().toISOString().split("T")[0] }).eq("id", m.id);
      if (error) throw error;
      await supabase.from("equipamentos").update({ status: "disponivel" }).eq("id", m.equipamento_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("Manutenção concluída!");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manutenção</h2>
          <p className="text-muted-foreground text-sm">{manutencoes.length} registro(s)</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" />Nova Manutenção</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Conclusão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manutencoes.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.equipamentos?.nome}</TableCell>
                    <TableCell>{m.tipo_reparo}</TableCell>
                    <TableCell>{m.profiles?.nome || "—"}</TableCell>
                    <TableCell>{new Date(m.data_inicio).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{m.data_conclusao ? new Date(m.data_conclusao).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={m.data_conclusao ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {m.data_conclusao ? "Concluída" : "Em Andamento"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!m.data_conclusao && (
                        <Button variant="outline" size="sm" onClick={() => concluirMut.mutate(m)}>Concluir</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {manutencoes.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma manutenção encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Manutenção</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMut.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Equipamento *</Label>
              <Select value={form.equipamento_id} onValueChange={v => setForm(f => ({ ...f, equipamento_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {equipamentos.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Reparo *</Label>
              <Input value={form.tipo_reparo} onChange={e => setForm(f => ({ ...f, tipo_reparo: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending}>Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

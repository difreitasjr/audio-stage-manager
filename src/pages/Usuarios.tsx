import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetores } from "@/hooks/useSetores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function Usuarios() {
  const qc = useQueryClient();
  const { data: setores = [] } = useSetores();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*, setores(nome)").order("nome");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p: any) => ({
        ...p,
        role: roles?.find((r: any) => r.user_id === p.user_id)?.role || "staff",
        role_id: roles?.find((r: any) => r.user_id === p.user_id)?.id,
      }));
    },
  });

  const [form, setForm] = useState({ nome: "", setor_id: "", role: "staff", ativo: true });

  const openEdit = (u: any) => {
    setEditProfile(u);
    setForm({ nome: u.nome, setor_id: u.setor_id || "", role: u.role, ativo: u.ativo });
    setDialogOpen(true);
  };

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editProfile) return;
      await supabase.from("profiles").update({
        nome: form.nome, setor_id: form.setor_id || null, ativo: form.ativo,
      }).eq("id", editProfile.id);

      if (editProfile.role_id) {
        await supabase.from("user_roles").update({ role: form.role as any }).eq("id", editProfile.role_id);
      } else {
        await supabase.from("user_roles").insert({ user_id: editProfile.user_id, role: form.role as any });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário atualizado!");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Usuários</h2>
        <p className="text-muted-foreground text-sm">{users.length} usuário(s)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>{u.setores?.nome || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className={u.role === "admin" ? "bg-primary/10 text-primary" : ""}>{u.role}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={u.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); updateMut.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={form.setor_id} onValueChange={v => setForm(f => ({ ...f, setor_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
              <Label>Ativo</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateMut.isPending}>Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

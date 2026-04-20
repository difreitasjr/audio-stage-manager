import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetores } from "@/hooks/useSetores";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Power, KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function Usuarios() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const { data: setores = [] } = useSetores();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState<any>(null);

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
  const [createForm, setCreateForm] = useState({ nome: "", email: "", password: "", setor_id: "", role: "staff" });

  const openEdit = (u: any) => {
    setEditProfile(u);
    setForm({ nome: u.nome, setor_id: u.setor_id || "", role: u.role, ativo: u.ativo });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setCreateForm({ nome: "", email: "", password: "", setor_id: "", role: "staff" });
    setCreateOpen(true);
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

  const toggleAtivoMut = useMutation({
    mutationFn: async (u: any) => {
      const { error } = await supabase.from("profiles").update({ ativo: !u.ativo }).eq("id", u.id);
      if (error) throw error;
      return !u.ativo;
    },
    onSuccess: (novoStatus) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(novoStatus ? "Usuário ativado" : "Usuário desativado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          nome: createForm.nome,
          email: createForm.email,
          password: createForm.password,
          setor_id: createForm.setor_id || null,
          role: createForm.role,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário criado!");
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar usuário"),
  });

  const resetPasswordMut = useMutation({
    mutationFn: async () => {
      if (!resetUser) return;
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { user_id: resetUser.user_id, password: newPassword },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      toast.success("Senha redefinida!");
      setResetUser(null);
      setNewPassword("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao redefinir senha"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usuários</h2>
          <p className="text-muted-foreground text-sm">{users.length} usuário(s)</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Novo Usuário
          </Button>
        )}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        title={u.ativo ? "Desativar" : "Ativar"}
                        onClick={() => {
                          if (u.ativo) setConfirmDeactivate(u);
                          else toggleAtivoMut.mutate(u);
                        }}
                        disabled={toggleAtivoMut.isPending}
                      >
                        <Power className={`w-4 h-4 ${u.ativo ? "text-green-600" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Redefinir senha"
                        onClick={() => { setResetUser(u); setNewPassword(""); }}
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={createForm.nome} onChange={(e) => setCreateForm((f) => ({ ...f, nome: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input type="password" minLength={6} value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={createForm.setor_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, setor_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Criando..." : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
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
      {/* Reset Password */}
      <Dialog open={!!resetUser} onOpenChange={(o) => { if (!o) { setResetUser(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redefinir senha — {resetUser?.nome}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (newPassword.length < 6) { toast.error("Mínimo 6 caracteres"); return; } resetPasswordMut.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha *</Label>
              <Input type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setResetUser(null); setNewPassword(""); }}>Cancelar</Button>
              <Button type="submit" disabled={resetPasswordMut.isPending}>{resetPasswordMut.isPending ? "Salvando..." : "Redefinir"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
      <AlertDialog open={!!confirmDeactivate} onOpenChange={(o) => { if (!o) setConfirmDeactivate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeactivate?.nome} não poderá mais fazer login até ser reativado. Confirma?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const u = confirmDeactivate;
                setConfirmDeactivate(null);
                if (u) toggleAtivoMut.mutate(u);
              }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

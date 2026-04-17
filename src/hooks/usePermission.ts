import { useAuth, Recurso } from "@/contexts/AuthContext";

export function usePermission(recurso: Recurso) {
  const { isAdmin, permissoes } = useAuth();

  if (isAdmin) {
    return { pode_ler: true, pode_criar: true, pode_editar: true, pode_excluir: true };
  }

  return permissoes[recurso] ?? {
    pode_ler: false,
    pode_criar: false,
    pode_editar: false,
    pode_excluir: false,
  };
}
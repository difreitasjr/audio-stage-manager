import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Package, ClipboardList, ArrowLeftRight,
  Wrench, Users, BarChart3, LogOut, Menu, X, ChevronDown, RefreshCw, ClipboardCheck, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

async function forceRefresh() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }
  // bypass HTTP cache
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
}

const adminNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/equipamentos", icon: Package, label: "Equipamentos" },
  { to: "/ordens", icon: ClipboardList, label: "Ordens de Serviço" },
  { to: "/conferencias", icon: ClipboardCheck, label: "Conferências" },
  { to: "/retornos", icon: RotateCcw, label: "Retornos" },
  { to: "/movimentacao", icon: ArrowLeftRight, label: "Movimentação" },
  { to: "/manutencao", icon: Wrench, label: "Manutenção" },
  { to: "/usuarios", icon: Users, label: "Usuários" },
  { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
];

const staffNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/equipamentos", icon: Package, label: "Equipamentos" },
  { to: "/ordens", icon: ClipboardList, label: "Ordens de Serviço" },
  { to: "/conferencias", icon: ClipboardCheck, label: "Conferências" },
  { to: "/retornos", icon: RotateCcw, label: "Retornos" },
  { to: "/movimentacao", icon: ArrowLeftRight, label: "Movimentação" },
  { to: "/manutencao", icon: Wrench, label: "Manutenção" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = isAdmin ? adminNav : staffNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:translate-x-0 lg:static",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Package className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-sidebar-primary-foreground">AV Control</span>
          <button className="ml-auto lg:hidden text-sidebar-muted" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-primary">
              {profile?.nome?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.nome || "Usuário"}</p>
              <p className="text-xs text-sidebar-muted capitalize">{isAdmin ? "Admin" : "Staff"}</p>
            </div>
            <button onClick={handleSignOut} className="text-sidebar-muted hover:text-sidebar-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center px-4 lg:px-6 bg-card">
          <button className="lg:hidden mr-3" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">
            {nav.find(n => n.to === location.pathname)?.label || "AV Control"}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-2"
            onClick={() => {
              toast({ title: "Atualizando...", description: "Carregando a versão mais recente." });
              forceRefresh();
            }}
            title="Forçar atualização (limpa cache)"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

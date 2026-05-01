import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Setup from "@/pages/Setup";
import Cadastro from "@/pages/Cadastro";
import Dashboard from "@/pages/Dashboard";
import Equipamentos from "@/pages/Equipamentos";
import OrdensServico from "@/pages/OrdensServico";
import Movimentacao from "@/pages/Movimentacao";
import Manutencao from "@/pages/Manutencao";
import Usuarios from "@/pages/Usuarios";
import Relatorios from "@/pages/Relatorios";
import NotFound from "@/pages/NotFound";
import ConferenciaPublica from "@/pages/ConferenciaPublica";
import Conferencias from "@/pages/Conferencias";
import Retornos from "@/pages/Retornos";
import RetornoDetalhe from "@/pages/RetornoDetalhe";
import BemVindo from "@/pages/BemVindo";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false, bare = false }: { children: React.ReactNode; adminOnly?: boolean; bare?: boolean }) {
  const { session, loading, isAdmin } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (bare) return <>{children}</>;
  return <AppLayout>{children}</AppLayout>;
}

/**
 * Rota pública: sempre renderiza imediatamente (sem loading screen).
 * Se uma sessão ativa for detectada, redireciona para /dashboard.
 * Usada em /login para garantir que o formulário aparece de imediato.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (session?.user) {
    const seen = (() => { try { return localStorage.getItem(`welcome_seen_${session.user.id}`); } catch { return "1"; } })();
    return <Navigate to={seen ? "/dashboard" : "/bem-vindo"} replace />;
  }
  return <>{children}</>;
}

/**
 * Raiz: mostra Landing pública para visitantes; usuários logados vão direto ao dashboard.
 */
function HomeRoute() {
  const { session } = useAuth();
  if (session) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/setup" element={<Setup />} />
              <Route path="/cadastro" element={<PublicRoute><Cadastro /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/conferencia/:token" element={<ConferenciaPublica />} />
              <Route path="/" element={<HomeRoute />} />
              <Route path="/bem-vindo" element={<ProtectedRoute bare><BemVindo /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/equipamentos" element={<ProtectedRoute><Equipamentos /></ProtectedRoute>} />
              <Route path="/ordens" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
              <Route path="/conferencias" element={<ProtectedRoute><Conferencias /></ProtectedRoute>} />
              <Route path="/retornos" element={<ProtectedRoute><Retornos /></ProtectedRoute>} />
              <Route path="/retornos/:id" element={<ProtectedRoute><RetornoDetalhe /></ProtectedRoute>} />
              <Route path="/movimentacao" element={<ProtectedRoute><Movimentacao /></ProtectedRoute>} />
              <Route path="/manutencao" element={<ProtectedRoute><Manutencao /></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute adminOnly><Relatorios /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

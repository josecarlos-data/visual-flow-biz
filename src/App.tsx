import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import LoadingScreen from "@/components/LoadingScreen";
import Auth from "./pages/Auth";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import Compras from "./pages/Compras";
import AdminUsers from "./pages/AdminUsers";
import AdminData from "./pages/AdminData";
import AdminFunctions from "./pages/AdminFunctions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  adminOnly = false,
  dashboardKey,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  dashboardKey?: string;
}) {
  const { user, isApproved, role, isLoading, hasDashboard, dashboards } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isApproved) return <Navigate to="/pending" replace />;
  if (adminOnly && role !== "admin") return <Navigate to="/" replace />;
  if (dashboardKey && !hasDashboard(dashboardKey)) {
    // Fallback to first available dashboard, or pending if none
    const fallback = dashboards[0]?.route;
    return <Navigate to={fallback && fallback !== `/${dashboardKey}` ? fallback : "/"} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isApproved, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (user && isApproved) return <Navigate to="/" replace />;
  if (user && !isApproved) return <Navigate to="/pending" replace />;

  return <>{children}</>;
}

function PendingRoute({ children }: { children: React.ReactNode }) {
  const { user, isApproved, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isApproved) return <Navigate to="/" replace />;

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
            <Route path="/pending" element={<PendingRoute><PendingApproval /></PendingRoute>} />
            <Route path="/" element={<ProtectedRoute dashboardKey="ventas"><Dashboard /></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute dashboardKey="compras"><Compras /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/data" element={<ProtectedRoute adminOnly><AdminData /></ProtectedRoute>} />
            <Route path="/admin/functions" element={<ProtectedRoute adminOnly><AdminFunctions /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

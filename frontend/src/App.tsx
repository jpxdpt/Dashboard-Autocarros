import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ScheduleManagement from './components/ScheduleManagement';
import { authService } from './services/auth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = authService.getToken();
      
      if (!token) {
        console.log('Nenhum token encontrado, redirecionando para login');
        setIsAuthenticated(false);
        return;
      }

      console.log('Token encontrado, verificando validade...');
      
      try {
        // Verificar se o token ainda é válido
        const userData = await authService.getCurrentUser();
        console.log('Token válido, utilizador autenticado:', userData.user.email);
        setIsAuthenticated(true);
      } catch (error: any) {
        console.error('Erro ao verificar autenticação:', error);
        console.error('Status:', error.response?.status);
        console.error('Mensagem:', error.response?.data?.error || error.message);
        
        // Se for 401 ou 403, limpar autenticação
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Token inválido, limpando autenticação');
          authService.clearAuth();
        }
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="text-center">
          <div className="text-xl text-label-secondary mb-2">A verificar autenticação...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <AppShell>
                <Reports />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <PrivateRoute>
              <AppShell>
                <ScheduleManagement />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

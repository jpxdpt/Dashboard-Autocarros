import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import Login from './components/Login';
import Register from './components/Register';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-2">A verificar autenticação...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex space-x-8">
              <Link
                to="/"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/reports"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Relatórios
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {authService.getUser() && (
                <span className="text-sm text-gray-600">
                  {authService.getUser()?.name}
                </span>
              )}
              <button
                onClick={() => authService.logout()}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <AppLayout>
                <Reports />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService, LoginData } from '../services/auth';

interface LoginProps {
  onLoginSuccess?: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginData: LoginData = { email, password };
      const response = await authService.login(loginData);
      
      // Verificar se os tokens foram guardados
      if (!authService.getToken()) {
        throw new Error('Token não foi guardado após login');
      }
      
      // Pequeno delay para garantir que o token foi guardado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        // Usar window.location para forçar reload completo
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao fazer login');
      authService.clearAuth(); // Limpar qualquer token inválido
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Entrar na sua conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Dashboard de Manutenção de Autocarros
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Não tem conta?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Registe-se aqui
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}


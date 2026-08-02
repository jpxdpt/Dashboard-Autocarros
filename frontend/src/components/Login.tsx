import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService, LoginData } from '../services/auth';
import AuthLayout from './auth/AuthLayout';
import Input from './ui/Input';
import Button from './ui/Button';

interface LoginProps {
  onLoginSuccess?: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginData: LoginData = { email, password };
      await authService.login(loginData);

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
    <AuthLayout
      title="Iniciar sessão"
      subtitle="Dashboard de Manutenção de Autocarros"
      footer={
        <>
          Não tem conta?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Registe-se aqui
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="footnote text-[var(--red)] bg-[var(--red)]/10 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          label="Palavra-passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="A sua palavra-passe"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'A entrar...' : 'Entrar'}
        </Button>
        <div className="text-center text-[14px]">
          <Link to="/forgot-password" className="font-medium text-accent hover:underline">
            Esqueceu-se da palavra-passe?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

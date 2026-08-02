import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService, RegisterData } from '../services/auth';
import AuthLayout from './auth/AuthLayout';
import Input from './ui/Input';
import Button from './ui/Button';

interface RegisterProps {
  onRegisterSuccess?: () => void;
}

export default function Register({ onRegisterSuccess }: RegisterProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const registerData: RegisterData = { name, email, password, companyName };
      await authService.register(registerData);

      // Verificar se os tokens foram guardados
      if (!authService.getToken()) {
        throw new Error('Token não foi guardado após registo');
      }

      // Pequeno delay para garantir que o token foi guardado
      await new Promise(resolve => setTimeout(resolve, 100));

      if (onRegisterSuccess) {
        onRegisterSuccess();
      } else {
        // Usar window.location para forçar reload completo
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Erro no registo:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao registar');
      authService.clearAuth(); // Limpar qualquer token inválido
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Dashboard de Manutenção de Autocarros"
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Entre aqui
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
          id="name"
          name="name"
          type="text"
          required
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="O seu nome"
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          label="Palavra-passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />
        <Input
          id="companyName"
          name="companyName"
          type="text"
          required
          label="Nome da Empresa"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Nome da sua empresa"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'A registar...' : 'Registar'}
        </Button>
      </form>
    </AuthLayout>
  );
}

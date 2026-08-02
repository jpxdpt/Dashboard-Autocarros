import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth';
import AuthLayout from './auth/AuthLayout';
import Input from './ui/Input';
import Button from './ui/Button';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As palavras-passe não coincidem');
      return;
    }

    if (newPassword.length < 8) {
      setError('A palavra-passe deve ter pelo menos 8 caracteres');
      return;
    }

    if (!token) {
      setError('Token inválido ou expirado');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, newPassword);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao redefinir palavra-passe');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="Link inválido"
        footer={
          <Link to="/forgot-password" className="font-medium text-accent hover:underline">
            Solicitar novo link
          </Link>
        }
      >
        <p className="footnote text-center">O link de redefinição é inválido ou expirou.</p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        title="Palavra-passe redefinida"
        footer={
          <Link to="/login" className="font-medium text-accent hover:underline">
            Entrar na sua conta
          </Link>
        }
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-[var(--green)]/15">
            <svg className="h-6 w-6 text-[var(--green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="footnote">A sua palavra-passe foi redefinida com sucesso.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nova palavra-passe">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="footnote text-[var(--red)] bg-[var(--red)]/10 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          label="Nova palavra-passe"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          label="Confirmar nova palavra-passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a palavra-passe"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'A redefinir...' : 'Redefinir palavra-passe'}
        </Button>
      </form>
    </AuthLayout>
  );
}

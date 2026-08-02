import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';
import AuthLayout from './auth/AuthLayout';
import Input from './ui/Input';
import Button from './ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Email enviado"
        footer={
          <Link to="/login" className="font-medium text-accent hover:underline">
            Voltar ao login
          </Link>
        }
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-[var(--green)]/15">
            <svg className="h-6 w-6 text-[var(--green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="footnote">
            Se o email existir, receberá um link para redefinir a palavra-passe.
            Verifique também a pasta de spam.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar palavra-passe"
      subtitle="Introduza o seu email para receber um link de redefinição"
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Voltar ao login
        </Link>
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'A enviar...' : 'Enviar link de recuperação'}
        </Button>
      </form>
    </AuthLayout>
  );
}

import { useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { useToast } from '../hooks/useToast';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';

export default function Settings() {
  const [userName, setUserName] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    const user = authService.getUser();
    if (user?.name) setUserName(user.name);
  }, []);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userName.trim()) return;

    try {
      setSaving(true);
      await authService.updateProfile(userName.trim());
      success('Nome atualizado com sucesso!');
    } catch (err: any) {
      error(err.response?.data?.error || 'Erro ao atualizar nome');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="title-2">Definições</h2>
        <p className="footnote mt-1">Gerir o seu perfil e preferências</p>
      </div>

      <Card className="p-6 max-w-2xl">
        <h3 className="headline mb-1">Perfil do utilizador</h3>
        <p className="footnote mb-5">O email é usado pela plataforma para alertas automáticos.</p>
        <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <Input
              label="Nome do utilizador"
              type="text"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

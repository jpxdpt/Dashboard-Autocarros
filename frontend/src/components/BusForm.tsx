import { useState, useEffect } from 'react';
import { Bus } from '../services/api';
import Sheet from './ui/Sheet';
import Input from './ui/Input';
import Button from './ui/Button';

interface BusFormProps {
  open: boolean;
  bus?: Bus;
  onSave: (matricula: string) => void;
  onCancel: () => void;
}

export default function BusForm({ open, bus, onSave, onCancel }: BusFormProps) {
  const [matricula, setMatricula] = useState(bus?.matricula || '');

  useEffect(() => {
    if (open) setMatricula(bus?.matricula || '');
  }, [open, bus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matricula.trim()) {
      onSave(matricula.trim().toUpperCase());
    }
  };

  return (
    <Sheet open={open} onClose={onCancel} title={`${bus ? 'Editar' : 'Adicionar'} Autocarro`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          label="Matrícula *"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value.toUpperCase())}
          required
          maxLength={20}
          autoFocus
          placeholder="Ex: AB-12-CD"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {bus ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

import { useState } from 'react';
import { Bus } from '../services/api';

interface BusFormProps {
  bus?: Bus;
  onSave: (matricula: string) => void;
  onCancel: () => void;
}

export default function BusForm({ bus, onSave, onCancel }: BusFormProps) {
  const [matricula, setMatricula] = useState(bus?.matricula || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matricula.trim()) {
      onSave(matricula.trim().toUpperCase());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {bus ? 'Editar' : 'Adicionar'} Autocarro
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Matrícula *
            </label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value.toUpperCase())}
              required
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: AB-12-CD"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {bus ? 'Atualizar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




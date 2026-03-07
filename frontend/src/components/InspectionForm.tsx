import { useState, useEffect } from 'react';
import { Bus, InspectionType, Inspection } from '../services/api';

interface InspectionFormProps {
  bus: Bus;
  inspectionType: InspectionType;
  inspection?: Inspection;
  onSave: (data: {
    busId: string;
    type: InspectionType;
    lastInspectionDate: string;
    nextInspectionDate?: string | null;
    mileage?: number | null;
    notes?: string | null;
  }) => void;
  onCancel: () => void;
}

const INSPECTION_LABELS: Record<InspectionType, string> = {
  EXTINTORES: 'Extintores',
  PNEUS: 'Pneus',
  REVISOES: 'Revisões',
  LICENCAS_TCC: 'Licenças TCC',
  LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
  INSPECOES: 'Inspeções',
};

const INSPECTION_INTERVALS: Record<InspectionType, number> = {
  EXTINTORES: 365,
  PNEUS: 90,
  REVISOES: 180,
  LICENCAS_TCC: 365,
  LICENCAS_COMUNITARIAS: 365,
  INSPECOES: 365,
};

export default function InspectionForm({
  bus,
  inspectionType,
  inspection,
  onSave,
  onCancel,
}: InspectionFormProps) {
  const [lastInspectionDate, setLastInspectionDate] = useState(
    inspection?.lastInspectionDate
      ? new Date(inspection.lastInspectionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [nextInspectionDate, setNextInspectionDate] = useState(
    inspection?.nextInspectionDate
      ? new Date(inspection.nextInspectionDate).toISOString().split('T')[0]
      : ''
  );
  const [mileage, setMileage] = useState<string>(
    inspection?.mileage ? inspection.mileage.toString() : ''
  );
  const [notes, setNotes] = useState(inspection?.notes || '');

  useEffect(() => {
    if (lastInspectionDate && !nextInspectionDate) {
      const interval = INSPECTION_INTERVALS[inspectionType];
      const nextDate = new Date(lastInspectionDate);
      nextDate.setDate(nextDate.getDate() + interval);
      setNextInspectionDate(nextDate.toISOString().split('T')[0]);
    }
  }, [lastInspectionDate, inspectionType, nextInspectionDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      busId: bus.id,
      type: inspectionType,
      lastInspectionDate,
      nextInspectionDate: nextInspectionDate || null,
      mileage: mileage ? parseInt(mileage, 10) : null,
      notes: notes || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {inspection ? 'Editar' : 'Adicionar'} Inspeção - {INSPECTION_LABELS[inspectionType]}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Autocarro: <span className="font-semibold">{bus.matricula}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`${inspectionType === InspectionType.PNEUS ? 'grid grid-cols-2 gap-4' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data da Última Inspeção *
              </label>
              <input
                type="date"
                value={lastInspectionDate}
                onChange={(e) => setLastInspectionDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {inspectionType === InspectionType.PNEUS && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quilometragem
                </label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="Ex: 150000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data da Próxima Inspeção
            </label>
            <input
              type="date"
              value={nextInspectionDate}
              onChange={(e) => setNextInspectionDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Calculado automaticamente se não preenchido ({INSPECTION_INTERVALS[inspectionType]} dias)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Adicione notas sobre esta inspeção..."
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
              {inspection ? 'Atualizar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




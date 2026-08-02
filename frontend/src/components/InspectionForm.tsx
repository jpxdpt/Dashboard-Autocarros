import { useState, useEffect } from 'react';
import { Bus, InspectionType, Inspection } from '../services/api';
import Sheet from './ui/Sheet';
import Input from './ui/Input';
import Button from './ui/Button';

interface InspectionFormProps {
  open: boolean;
  bus?: Bus;
  inspectionType?: InspectionType;
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
  INSPECOES_EXTRAORDINARIAS: 'Inspeções Extraordinárias',
};

const INSPECTION_INTERVALS: Record<InspectionType, number> = {
  EXTINTORES: 365,
  PNEUS: 90,
  REVISOES: 180,
  LICENCAS_TCC: 365,
  LICENCAS_COMUNITARIAS: 365,
  INSPECOES: 365,
  INSPECOES_EXTRAORDINARIAS: 365,
};

const textareaClasses =
  'w-full px-3.5 py-2.5 rounded-xl bg-surface text-label border border-separator placeholder:text-label-tertiary outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 transition-shadow';

export default function InspectionForm({
  open,
  bus,
  inspectionType,
  inspection,
  onSave,
  onCancel,
}: InspectionFormProps) {
  const [lastInspectionDate, setLastInspectionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [nextInspectionDate, setNextInspectionDate] = useState('');
  const [mileage, setMileage] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Reinicializar o formulário cada vez que abre
  useEffect(() => {
    if (open) {
      setLastInspectionDate(
        inspection?.lastInspectionDate
          ? new Date(inspection.lastInspectionDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setNextInspectionDate(
        inspection?.nextInspectionDate
          ? new Date(inspection.nextInspectionDate).toISOString().split('T')[0]
          : ''
      );
      setMileage(inspection?.mileage ? inspection.mileage.toString() : '');
      setNotes(inspection?.notes || '');
    }
  }, [open, inspection]);

  useEffect(() => {
    if (lastInspectionDate && !nextInspectionDate && inspectionType) {
      const interval = INSPECTION_INTERVALS[inspectionType];
      const nextDate = new Date(lastInspectionDate);
      nextDate.setDate(nextDate.getDate() + interval);
      setNextInspectionDate(nextDate.toISOString().split('T')[0]);
    }
  }, [lastInspectionDate, inspectionType, nextInspectionDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bus || !inspectionType) return;
    onSave({
      busId: bus.id,
      type: inspectionType,
      lastInspectionDate,
      nextInspectionDate: nextInspectionDate || null,
      mileage: mileage ? parseInt(mileage, 10) : null,
      notes: notes || null,
    });
  };

  const title = inspectionType
    ? `${inspection ? 'Editar' : 'Adicionar'} Inspeção — ${INSPECTION_LABELS[inspectionType]}`
    : 'Inspeção';

  return (
    <Sheet open={open && !!bus && !!inspectionType} onClose={onCancel} title={title}>
      <p className="footnote mb-4">
        Autocarro: <span className="font-semibold text-label">{bus?.matricula}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`${inspectionType === InspectionType.PNEUS ? 'grid grid-cols-2 gap-4' : ''}`}>
          <Input
            type="date"
            label="Data da Última Inspeção *"
            value={lastInspectionDate}
            onChange={(e) => setLastInspectionDate(e.target.value)}
            required
          />
          {inspectionType === InspectionType.PNEUS && (
            <Input
              type="number"
              label="Quilometragem"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="Ex: 150000"
            />
          )}
        </div>

        <div>
          <Input
            type="date"
            label="Data da Próxima Inspeção"
            value={nextInspectionDate}
            onChange={(e) => setNextInspectionDate(e.target.value)}
          />
          <p className="footnote mt-1">
            Calculado automaticamente se não preenchido
            {inspectionType ? ` (${INSPECTION_INTERVALS[inspectionType]} dias)` : ''}
          </p>
        </div>

        <label className="block">
          <span className="footnote block mb-1.5">Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={textareaClasses}
            placeholder="Adicione notas sobre esta inspeção..."
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {inspection ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

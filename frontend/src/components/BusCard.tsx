import { Bus, InspectionType, Inspection } from '../services/api';
import AlertBadge from './AlertBadge';
import Card from './ui/Card';
import Badge from './ui/Badge';

interface BusCardProps {
  bus: Bus;
  onEdit: (bus: Bus) => void;
  onDelete: (id: string) => void;
  onInspectionClick: (bus: Bus, inspectionType: InspectionType) => void;
  onMileageClick?: (bus: Bus) => void;
}

const INSPECTION_TYPES: InspectionType[] = [
  InspectionType.EXTINTORES,
  InspectionType.PNEUS,
  InspectionType.REVISOES,
  InspectionType.LICENCAS_TCC,
  InspectionType.LICENCAS_COMUNITARIAS,
  InspectionType.INSPECOES,
  InspectionType.INSPECOES_EXTRAORDINARIAS,
];

const INSPECTION_LABELS: Record<InspectionType, string> = {
  EXTINTORES: 'Extintores',
  PNEUS: 'Pneus',
  REVISOES: 'Revisões',
  LICENCAS_TCC: 'Licenças TCC',
  LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
  INSPECOES: 'Inspeções',
  INSPECOES_EXTRAORDINARIAS: 'Inspeções Extraordinárias',
};

function getInspectionStatus(inspection: Inspection | undefined): {
  status: 'ok' | 'warning' | 'expired';
  daysUntilDue: number | null;
} {
  if (!inspection || !inspection.nextInspectionDate) {
    return { status: 'ok', daysUntilDue: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextDate = new Date(inspection.nextInspectionDate);
  nextDate.setHours(0, 0, 0, 0);

  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', daysUntilDue: diffDays };
  } else if (diffDays <= 30) {
    return { status: 'warning', daysUntilDue: diffDays };
  } else {
    return { status: 'ok', daysUntilDue: diffDays };
  }
}

export default function BusCard({ bus, onEdit, onDelete, onInspectionClick, onMileageClick }: BusCardProps) {
  const getInspectionByType = (type: InspectionType) => {
    return bus.inspections.find((insp) => insp.type === type);
  };

  return (
    <Card className="hover:shadow-sheet transition-all duration-200 active:scale-[0.99] p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="title-2">{bus.matricula}</h3>
          {bus.currentMileage !== null && bus.currentMileage !== undefined && (
            <p className="footnote mt-1">
              {bus.currentMileage.toLocaleString('pt-PT')} km
            </p>
          )}
          {bus.driverAssignments && bus.driverAssignments.length > 0 && (
            <div className="mt-2">
              <p className="footnote mb-1">Condutores:</p>
              <div className="flex flex-wrap gap-1">
                {bus.driverAssignments.map((assignment) => (
                  <Badge key={assignment.id} tone="blue">
                    {assignment.driver.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {onMileageClick && (
            <button
              onClick={() => onMileageClick(bus)}
              className="px-2.5 py-1.5 text-[13px] font-medium text-[var(--green)] hover:bg-fill rounded-lg transition-all duration-100 active:scale-95"
              title="Gestão de Quilometragem"
            >
              KM
            </button>
          )}
          <button
            onClick={() => onEdit(bus)}
            className="px-2.5 py-1.5 text-[13px] font-medium text-accent hover:bg-fill rounded-lg transition-all duration-100 active:scale-95"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(bus.id)}
            className="px-2.5 py-1.5 text-[13px] font-medium text-[var(--red)] hover:bg-fill rounded-lg transition-all duration-100 active:scale-95"
          >
            Remover
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="footnote uppercase tracking-wide font-semibold">
          Inspeções
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {INSPECTION_TYPES.map((type) => {
            const inspection = getInspectionByType(type);
            const { status, daysUntilDue } = getInspectionStatus(inspection);

            return (
              <div
                key={type}
                onClick={() => onInspectionClick(bus, type)}
                className="flex items-center justify-between p-3 bg-surface-2 hover:bg-fill rounded-xl cursor-pointer transition-colors"
              >
                <span className="text-[14px] font-medium text-label">
                  {INSPECTION_LABELS[type]}
                </span>
                {inspection ? (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="footnote">
                        {new Date(inspection.lastInspectionDate).toLocaleDateString('pt-PT')}
                      </span>
                      {type === InspectionType.PNEUS && inspection.mileage && (
                        <span className="text-[11px] font-medium text-accent">
                          {inspection.mileage.toLocaleString('pt-PT')} km
                        </span>
                      )}
                    </div>
                    <AlertBadge status={status} daysUntilDue={daysUntilDue} type={type} />
                  </div>
                ) : (
                  <span className="text-[12px] text-label-tertiary italic">Não registado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

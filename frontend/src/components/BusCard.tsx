import { Bus, InspectionType, Inspection } from '../services/api';
import AlertBadge from './AlertBadge';

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
];

const INSPECTION_LABELS: Record<InspectionType, string> = {
  EXTINTORES: 'Extintores',
  PNEUS: 'Pneus',
  REVISOES: 'Revisões',
  LICENCAS_TCC: 'Licenças TCC',
  LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
  INSPECOES: 'Inspeções',
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
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-800">{bus.matricula}</h3>
          {bus.currentMileage !== null && bus.currentMileage !== undefined && (
            <p className="text-sm text-gray-600 mt-1">
              📊 {bus.currentMileage.toLocaleString('pt-PT')} km
            </p>
          )}
          {bus.driverAssignments && bus.driverAssignments.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Condutores:</p>
              <div className="flex flex-wrap gap-1">
                {bus.driverAssignments.map((assignment) => (
                  <span
                    key={assignment.id}
                    className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                  >
                    👤 {assignment.driver.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {onMileageClick && (
            <button
              onClick={() => onMileageClick(bus)}
              className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
              title="Gestão de Quilometragem"
            >
              📊 KM
            </button>
          )}
          <button
            onClick={() => onEdit(bus)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(bus.id)}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          >
            Remover
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
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
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  {INSPECTION_LABELS[type]}
                </span>
                {inspection ? (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-500">
                        {new Date(inspection.lastInspectionDate).toLocaleDateString('pt-PT')}
                      </span>
                      {type === InspectionType.PNEUS && inspection.mileage && (
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1 rounded">
                          {inspection.mileage.toLocaleString('pt-PT')} km
                        </span>
                      )}
                    </div>
                    <AlertBadge status={status} daysUntilDue={daysUntilDue} type={type} />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Não registado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


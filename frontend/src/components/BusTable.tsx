import { Bus, InspectionType, Inspection } from '../services/api';
import AlertBadge from './AlertBadge';

interface BusTableProps {
  buses: Bus[];
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

export default function BusTable({ buses, onEdit, onDelete, onInspectionClick, onMileageClick }: BusTableProps) {
  const getInspectionByType = (bus: Bus, type: InspectionType) => {
    return bus.inspections.find((insp) => insp.type === type);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Matrícula
              </th>
              {INSPECTION_TYPES.map((type) => (
                <th
                  key={type}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {INSPECTION_LABELS[type]}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {buses.length === 0 ? (
              <tr>
                <td colSpan={INSPECTION_TYPES.length + 2} className="px-6 py-8 text-center text-gray-500">
                  Nenhum autocarro registado
                </td>
              </tr>
            ) : (
              buses.map((bus) => (
                <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{bus.matricula}</div>
                    {bus.currentMileage !== null && bus.currentMileage !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        📊 {bus.currentMileage.toLocaleString('pt-PT')} km
                      </div>
                    )}
                    {bus.driverAssignments && bus.driverAssignments.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        👤 {bus.driverAssignments.map(a => a.driver.name).join(', ')}
                      </div>
                    )}
                  </td>
                  {INSPECTION_TYPES.map((type) => {
                    const inspection = getInspectionByType(bus, type);
                    const { status, daysUntilDue } = getInspectionStatus(inspection);

                    return (
                      <td key={type} className="px-4 py-4 whitespace-nowrap text-center">
                        {inspection ? (
                          <div
                            onClick={() => onInspectionClick(bus, type)}
                            className="cursor-pointer inline-block"
                          >
                            <AlertBadge status={status} daysUntilDue={daysUntilDue} type={type} />
                          </div>
                        ) : (
                          <span
                            onClick={() => onInspectionClick(bus, type)}
                            className="text-xs text-gray-400 italic cursor-pointer hover:text-gray-600"
                          >
                            Não registado
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {onMileageClick && (
                      <button
                        onClick={() => onMileageClick(bus)}
                        className="text-green-600 hover:text-green-900 mr-4"
                        title="Gestão de Quilometragem"
                      >
                        📊 KM
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(bus)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(bus.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


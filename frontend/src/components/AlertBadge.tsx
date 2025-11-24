import { InspectionType } from '../services/api';

interface AlertBadgeProps {
  status: 'ok' | 'warning' | 'expired';
  daysUntilDue: number | null;
  type: InspectionType;
}

const INSPECTION_LABELS: Record<InspectionType, string> = {
  EXTINTORES: 'Extintores',
  PNEUS: 'Pneus',
  REVISOES: 'Revisões',
  LICENCAS_TCC: 'Licenças TCC',
  LICENCAS_COMUNITARIAS: 'Licenças Comunitárias',
  INSPECOES: 'Inspeções',
};

export default function AlertBadge({ status, daysUntilDue, type }: AlertBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'expired':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-300',
          icon: '⚠️',
          label: 'Expirado',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-300',
          icon: '⏰',
          label: 'Próximo',
        };
      default:
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-300',
          icon: '✓',
          label: 'OK',
        };
    }
  };

  const config = getStatusConfig();
  const daysText = daysUntilDue !== null 
    ? daysUntilDue < 0 
      ? `${Math.abs(daysUntilDue)} dias atrás`
      : `${daysUntilDue} dias`
    : 'N/A';

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} text-sm font-medium`}
      title={`${INSPECTION_LABELS[type]}: ${config.label} (${daysText})`}
    >
      <span>{config.icon}</span>
      <span>{INSPECTION_LABELS[type]}</span>
      <span className="text-xs opacity-75">({daysText})</span>
    </div>
  );
}




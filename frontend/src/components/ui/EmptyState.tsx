import { ReactNode } from 'react';

export default function EmptyState({
  icon, title, message, action,
}: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-label-tertiary mb-3">{icon}</div>}
      <h3 className="headline mb-1">{title}</h3>
      {message && <p className="footnote max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

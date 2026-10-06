import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const STYLES = {
  error: { cls: 'border-red-200 bg-red-50 text-red-800', Icon: XCircle },
  success: { cls: 'border-green-200 bg-green-50 text-green-800', Icon: CheckCircle2 },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-800', Icon: AlertTriangle },
  info: { cls: 'border-sky-200 bg-sky-50 text-sky-800', Icon: Info },
};

export default function Alert({ type = 'info', children, className = '' }) {
  if (!children) return null;
  const { cls, Icon } = STYLES[type];
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${cls} ${className}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

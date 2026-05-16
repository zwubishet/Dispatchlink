import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../lib/utils';

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${ORDER_STATUS_COLORS[status] || 'bg-stone-100 text-stone-600'}`}>
      {ORDER_STATUS_LABELS[status] || status}
    </span>
  );
}

export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin`} />
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-950 tracking-normal">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={40} className="text-brand-300 mb-3" />}
      <p className="text-stone-700 font-semibold">{title}</p>
      {description && <p className="text-stone-400 text-sm mt-1">{description}</p>}
    </div>
  );
}

export function StatCard({ label, value, sub, color = 'lemon', icon: Icon }) {
  const colors = {
    lemon: 'bg-brand-50 text-brand-700 border-brand-100',
    olive: 'bg-lime-50 text-lime-700 border-lime-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-lime-50 text-lime-700 border-lime-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red: 'bg-red-50 text-red-600',
    stone: 'bg-stone-100 text-stone-600 border-stone-200',
  };
  return (
    <div className="card p-5 hover:shadow-md hover:shadow-stone-900/10 transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colors[color] || colors.lemon}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-stone-950">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/45" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-950">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-50 text-stone-400">
            ✕
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

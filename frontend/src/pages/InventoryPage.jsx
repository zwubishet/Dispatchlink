import { useEffect, useState } from 'react';
import { BarChart3, ArrowUp, ArrowDown, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Spinner, EmptyState, Modal } from '../components/ui';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ movement_type: 'in', quantity: '', note: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/inventory');
      setInventory(data);
    } finally {
      setLoading(false);
    }
  }

  function openAdjust(item) {
    setSelected(item);
    setForm({ movement_type: 'in', quantity: '', note: '' });
    setModal(true);
  }

  async function handleAdjust(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/inventory/adjust', {
        product_id: selected.product.id,
        movement_type: form.movement_type,
        quantity: parseInt(form.quantity),
        note: form.note,
      });
      toast.success('Stock updated');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  }

  const lowStock = inventory.filter((i) => i.quantity_available <= i.low_stock_threshold);

  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${inventory.length} products tracked`} />

      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{lowStock.length} product{lowStock.length > 1 ? 's' : ''}</span> below low stock threshold
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : inventory.length === 0 ? (
          <EmptyState icon={BarChart3} title="No inventory data" description="Add products to start tracking inventory" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">In Stock</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Threshold</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inventory.map((item) => {
                  const isLow = item.quantity_available <= item.low_stock_threshold;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.product?.name}</p>
                        <p className="text-xs text-gray-400">{item.product?.sku || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.product?.category?.name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-base ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.quantity_available}
                        </span>
                        {isLow && (
                          <span className="ml-1.5 text-xs text-red-500 font-medium">Low</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{item.low_stock_threshold}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(item.updated_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openAdjust(item)}
                          className="btn-secondary text-xs py-1.5"
                        >
                          <RefreshCw size={13} /> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={`Adjust Stock — ${selected?.product?.name}`}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <div className="flex gap-2">
            {[
              { value: 'in', label: 'Stock In', icon: ArrowUp, color: 'text-green-600 border-green-300 bg-green-50' },
              { value: 'out', label: 'Stock Out', icon: ArrowDown, color: 'text-red-600 border-red-300 bg-red-50' },
              { value: 'adjustment', label: 'Set Exact', icon: RefreshCw, color: 'text-blue-600 border-blue-300 bg-blue-50' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, movement_type: value })}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-medium transition-colors
                  ${form.movement_type === value ? color : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="label">
              {form.movement_type === 'adjustment' ? 'Set quantity to' : 'Quantity'}
            </label>
            <input
              className="input"
              type="number"
              min="1"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Note (optional)</label>
            <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Reason for adjustment..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

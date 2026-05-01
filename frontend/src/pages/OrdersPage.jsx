import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, StatusBadge, Spinner, EmptyState } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/utils';
import { ShoppingCart } from 'lucide-react';

const STATUSES = ['', 'pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, [status]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const { data } = await api.get(`/orders?${params}`);
      setOrders(data.orders);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search.toLowerCase()) ||
          o.shop?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${total} total orders`}
        action={
          <button className="btn-primary" onClick={() => navigate('/orders/new')}>
            <Plus size={16} /> New Order
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by order number or shop..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-44"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All statuses'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders found" description="Orders will appear here once created" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Shop</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-brand-600">{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-700">{order.shop?.name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

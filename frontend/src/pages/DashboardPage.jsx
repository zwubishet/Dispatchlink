import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Package, Store, Truck,
  TrendingUp, AlertTriangle, Clock,
} from 'lucide-react';
import api from '../lib/api';
import { StatCard, Spinner, StatusBadge } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/utils';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, r, t] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/recent-orders'),
          api.get('/dashboard/top-products'),
        ]);
        setSummary(s.data);
        setRecentOrders(r.data);
        setTopProducts(t.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your distribution operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={summary?.orders?.total || 0}
          sub={`${summary?.orders?.pending || 0} pending`}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(summary?.revenue?.monthly_revenue || 0)}
          sub="This month"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Active Shops"
          value={summary?.shops?.active || 0}
          sub={`${summary?.shops?.total || 0} total`}
          icon={Store}
          color="purple"
        />
        <StatCard
          label="Low Stock Items"
          value={summary?.low_stock_count || 0}
          sub="Need restocking"
          icon={AlertTriangle}
          color={summary?.low_stock_count > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Order status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', key: 'pending', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'In Transit', key: 'in_transit', color: 'bg-orange-50 border-orange-200 text-orange-700' },
          { label: 'Delivered', key: 'delivered', color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Cancelled', key: 'cancelled', color: 'bg-gray-50 border-gray-200 text-gray-600' },
        ].map(({ label, key, color }) => (
          <div key={key} className={`rounded-xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{summary?.orders?.[key] || 0}</p>
            <p className="text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-500">{order.shop_name}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="text-xs text-gray-400 mt-1">{formatCurrency(order.total_amount)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Top Products</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No sales data yet</p>
            ) : (
              topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.total_quantity_sold} {p.unit}s sold</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(p.total_revenue)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

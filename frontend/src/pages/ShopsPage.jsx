import { useEffect, useState } from 'react';
import { Plus, Search, Store, Phone, MapPin } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Spinner, EmptyState, Modal } from '../components/ui';
import toast from 'react-hot-toast';

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', owner_name: '', phone: '', address: '', subcity: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/shops');
      setShops(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/shops', form);
      toast.success('Shop added');
      setModal(false);
      setForm({ name: '', owner_name: '', phone: '', address: '', subcity: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add shop');
    } finally {
      setSaving(false);
    }
  }

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    (s.owner_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Shops"
        subtitle={`${shops.length} registered shops`}
        action={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Add Shop
          </button>
        }
      />

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search shops..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Store} title="No shops found" description="Add your first shop to get started" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((shop) => (
            <div key={shop.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                  <Store size={18} className="text-brand-600" />
                </div>
                <span className={`badge ${shop.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {shop.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-0.5">{shop.name}</h3>
              {shop.owner_name && <p className="text-sm text-gray-500 mb-2">{shop.owner_name}</p>}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Phone size={12} />
                  {shop.phone}
                </div>
                {shop.address && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={12} />
                    {shop.address}{shop.subcity ? `, ${shop.subcity}` : ''}
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {shop.orders_aggregate?.aggregate?.count || 0} orders
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add New Shop">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Shop Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Owner Name</label>
            <input className="input" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xxxxxxxx" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Subcity</label>
              <input className="input" value={form.subcity} onChange={(e) => setForm({ ...form, subcity: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving...' : 'Add Shop'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

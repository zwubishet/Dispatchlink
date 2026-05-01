import { useEffect, useState } from 'react';
import { Plus, Truck, Phone, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Spinner, EmptyState, Modal } from '../components/ui';
import toast from 'react-hot-toast';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', vehicle_plate: '', vehicle_type: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/drivers');
      setDrivers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // First create user, then driver
      const userRes = await api.post('/auth/register', {
        name: form.name,
        phone: form.phone,
        password: form.phone, // default password = phone number
        role: 'driver',
      });
      await api.post('/drivers', {
        user_id: userRes.data.user.id,
        vehicle_plate: form.vehicle_plate,
        vehicle_type: form.vehicle_type,
      });
      toast.success('Driver added. Default password is their phone number.');
      setModal(false);
      setForm({ name: '', phone: '', vehicle_plate: '', vehicle_type: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add driver');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(driver) {
    try {
      await api.patch(`/drivers/${driver.id}/availability`, { is_available: !driver.is_available });
      setDrivers((prev) => prev.map((d) => d.id === driver.id ? { ...d, is_available: !d.is_available } : d));
    } catch {
      toast.error('Failed to update availability');
    }
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle={`${drivers.length} drivers`}
        action={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Add Driver
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : drivers.length === 0 ? (
        <EmptyState icon={Truck} title="No drivers yet" description="Add drivers to assign deliveries" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <div key={driver.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Truck size={18} className="text-indigo-600" />
                </div>
                <button
                  onClick={() => toggleAvailability(driver)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors
                    ${driver.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {driver.is_available ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {driver.is_available ? 'Available' : 'Unavailable'}
                </button>
              </div>
              <h3 className="font-semibold text-gray-900">{driver.user?.name}</h3>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Phone size={12} />
                  {driver.user?.phone}
                </div>
                {driver.vehicle_plate && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Truck size={12} />
                    {driver.vehicle_plate} {driver.vehicle_type ? `· ${driver.vehicle_type}` : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add New Driver">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xxxxxxxx" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vehicle Plate</label>
              <input className="input" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} placeholder="AA 12345" />
            </div>
            <div>
              <label className="label">Vehicle Type</label>
              <input className="input" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} placeholder="Truck, Van..." />
            </div>
          </div>
          <p className="text-xs text-gray-400">Default login password will be the driver's phone number.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving...' : 'Add Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

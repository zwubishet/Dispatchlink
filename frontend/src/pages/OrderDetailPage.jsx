import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import api from '../lib/api';
import { StatusBadge, Spinner, Modal } from '../components/ui';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '../lib/utils';
import toast from 'react-hot-toast';

const TRANSITIONS = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ notes: '', delivery_address: '' });
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [driverId, setDriverId] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrder();
    api.get('/drivers').then(({ data }) => setDrivers(data)).catch(() => {});
  }, [id]);

  async function loadOrder() {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.patch(`/orders/${id}/details`, editForm);
      toast.success('Order updated');
      setEditModal(false);
      loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  async function handleStatusUpdate() {    setUpdating(true);
    try {
      await api.patch(`/orders/${id}/status`, {
        status: newStatus,
        note,
        driver_id: newStatus === 'assigned' ? driverId : undefined,
      });
      toast.success(`Order updated to ${ORDER_STATUS_LABELS[newStatus]}`);
      setStatusModal(false);
      setNote('');
      loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!order) return <p className="text-gray-500">Order not found</p>;

  const nextStatuses = TRANSITIONS[order.status] || [];

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
        <ArrowLeft size={16} /> Back to orders
      </button>

      {/* Header */}
      <div className="card p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{formatDate(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            {order.status === 'pending' && (
              <button
                onClick={() => { setEditForm({ notes: order.notes || '', delivery_address: order.delivery_address || '' }); setEditModal(true); }}
                className="btn-secondary text-xs py-1.5"
              >
                <Pencil size={13} /> Edit
              </button>
            )}
            {nextStatuses.length > 0 && (
              <button onClick={() => setStatusModal(true)} className="btn-primary text-xs py-1.5">
                Update Status
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {/* Shop info */}
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Shop</p>
          <p className="font-semibold text-gray-900">{order.shop?.name}</p>
          <p className="text-sm text-gray-500">{order.shop?.phone}</p>
          <p className="text-sm text-gray-500">{order.shop?.address}, {order.shop?.subcity}</p>
        </div>

        {/* Delivery info */}
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Delivery</p>
          {order.delivery ? (
            <>
              <p className="font-semibold text-gray-900">{order.delivery.driver?.user?.name || 'Driver assigned'}</p>
              <p className="text-sm text-gray-500">{order.delivery.driver?.vehicle_plate}</p>
              {order.delivery.picked_up_at && (
                <p className="text-xs text-gray-400 mt-1">Picked up: {formatDate(order.delivery.picked_up_at)}</p>
              )}
              {order.delivery.delivered_at && (
                <p className="text-xs text-green-600 mt-1">Delivered: {formatDate(order.delivery.delivered_at)}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Not yet assigned</p>
          )}
        </div>
      </div>

      {/* Order items */}
      <div className="card mb-4">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Order Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50">
              <th className="text-left px-5 py-2.5 font-medium text-gray-600">Product</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600">Qty</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600">Unit Price</th>
              <th className="text-right px-5 py-2.5 font-medium text-gray-600">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {order.order_items?.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3 text-gray-900">{item.product?.name}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.quantity} {item.product?.unit}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                <td className="px-5 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50">
              <td colSpan={3} className="px-5 py-3 text-right font-semibold text-gray-900">Total</td>
              <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(order.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status history */}
      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Status History</h2>
        </div>
        <div className="px-5 py-3 space-y-3">
          {order.order_status_histories?.map((h) => (
            <div key={h.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-900">
                  {h.from_status ? `${ORDER_STATUS_LABELS[h.from_status]} → ` : ''}
                  <span className="font-medium">{ORDER_STATUS_LABELS[h.to_status]}</span>
                </p>
                {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                <p className="text-xs text-gray-400">{formatDate(h.created_at)} · {h.user?.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit order modal (pending only) */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Order">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="label">Delivery Address</label>
            <input className="input" value={editForm.delivery_address} onChange={e => setEditForm({ ...editForm, delivery_address: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Special instructions..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setEditModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={updating}>
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Status update modal */}
      <Modal open={statusModal} onClose={() => { setStatusModal(false); setNewStatus(''); setNote(''); setDriverId(''); }} title="Update Order Status">
        <div className="space-y-4">

          {/* Step indicator */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="text-sm text-gray-500">Current status</div>
            <StatusBadge status={order.status} />
          </div>

          <div>
            <label className="label">Move to</label>
            <div className="grid grid-cols-2 gap-2">
              {nextStatuses.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setNewStatus(s); if (s !== 'assigned') setDriverId(''); }}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left
                    ${newStatus === s
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {ORDER_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Driver assignment — shown when moving to assigned */}
          {newStatus === 'assigned' && (
            <div>
              <label className="label">Assign Driver *</label>
              {drivers.length === 0 ? (
                <p className="text-sm text-red-500">No drivers available. Add drivers first.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {drivers.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDriverId(d.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors
                        ${driverId === d.id
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{d.user?.name}</p>
                        <p className="text-xs text-gray-500">{d.vehicle_plate || 'No plate'} {d.vehicle_type ? `· ${d.vehicle_type}` : ''}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {d.is_available ? 'Available' : 'Busy'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note about this update..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => { setStatusModal(false); setNewStatus(''); setNote(''); setDriverId(''); }}>
              Cancel
            </button>
            <button
              className="btn-primary flex-1 justify-center"
              onClick={handleStatusUpdate}
              disabled={!newStatus || updating || (newStatus === 'assigned' && !driverId)}
            >
              {updating ? 'Updating...' : `Confirm${newStatus ? ' — ' + ORDER_STATUS_LABELS[newStatus] : ''}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

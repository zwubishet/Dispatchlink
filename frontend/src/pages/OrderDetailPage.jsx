import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, MapPin, Navigation, Truck, Clock } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import api from '../lib/api';
import { StatusBadge, Spinner, Modal } from '../components/ui';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '../lib/utils';
import toast from 'react-hot-toast';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const TRANSITIONS = {
  pending:    ['confirmed', 'rejected', 'cancelled'],
  confirmed:  ['assigned', 'cancelled'],
  assigned:   ['picked_up', 'cancelled'],
  picked_up:  ['in_transit'],
  in_transit: ['delivered'],
};

async function fetchRoute(pickup, dropoff) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
    `?geometries=geojson&access_token=${mapboxgl.accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.routes?.[0]?.geometry ?? null;
}

function OrderMap({ pickup, dropoff }) {
  const container = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!container.current || map.current) return;

    const bounds = new mapboxgl.LngLatBounds(
      [pickup.lng, pickup.lat],
      [dropoff.lng, dropoff.lat]
    );

    map.current = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/light-v11',
      bounds,
      fitBoundsOptions: { padding: 60 },
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.current.on('load', async () => {
      // Pickup pin — green
      const mkPickup = document.createElement('div');
      mkPickup.innerHTML = `
        <div class="order-map-pin" style="background:#16a34a">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform:rotate(45deg)">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
        </div>
        <div class="order-map-label">Pickup</div>`;
      new mapboxgl.Marker({ element: mkPickup, anchor: 'bottom' })
        .setLngLat([pickup.lng, pickup.lat])
        .setPopup(new mapboxgl.Popup({ offset: 28, closeButton: false })
          .setHTML(`<p style="font-size:12px;font-weight:600;color:#166534;margin:0">Pickup</p>
                    <p style="font-size:11px;color:#6b7280;margin:2px 0 0;max-width:200px">${pickup.name}</p>`))
        .addTo(map.current);

      // Dropoff pin — red
      const mkDropoff = document.createElement('div');
      mkDropoff.innerHTML = `
        <div class="order-map-pin" style="background:#dc2626">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform:rotate(45deg)">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="order-map-label">Dropoff</div>`;
      new mapboxgl.Marker({ element: mkDropoff, anchor: 'bottom' })
        .setLngLat([dropoff.lng, dropoff.lat])
        .setPopup(new mapboxgl.Popup({ offset: 28, closeButton: false })
          .setHTML(`<p style="font-size:12px;font-weight:600;color:#991b1b;margin:0">Dropoff</p>
                    <p style="font-size:11px;color:#6b7280;margin:2px 0 0;max-width:200px">${dropoff.name}</p>`))
        .addTo(map.current);

      // Route line
      try {
        const geometry = await fetchRoute(pickup, dropoff);
        if (geometry) {
          map.current.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry } });
          map.current.addLayer({
            id: 'route', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#6366f1', 'line-width': 4, 'line-opacity': 0.85 },
          });
        }
      } catch { /* silent */ }
    });

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />;
}

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

  async function handleStatusUpdate() {
    setUpdating(true);
    try {
      await api.patch(`/orders/${id}/status`, {
        status: newStatus, note,
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
  const hasRoute = order.pickup_lat != null && order.dropoff_lat != null;

  return (
    <>
      {/* Fixed full-screen layout: left panel + right map */}
      <div className="fixed inset-0 lg:left-64 top-0 flex flex-col bg-gray-50 z-10">

        {/* Top bar */}
        <div className="flex-shrink-0 px-4 lg:px-6 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/orders')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="font-bold text-gray-900">{order.order_number}</h1>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* ── Left: order details ── */}
          <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white">
            <div className="p-4 space-y-4">

              {/* Shop & Delivery */}
              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Shop</p>
                  <p className="font-semibold text-gray-900">{order.shop?.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{order.shop?.phone}</p>
                  <p className="text-sm text-gray-400">{order.shop?.address}{order.shop?.subcity ? `, ${order.shop.subcity}` : ''}</p>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Delivery</p>
                  {order.delivery ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-indigo-500" />
                        <p className="font-semibold text-gray-900">{order.delivery.driver?.user?.name}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{order.delivery.driver?.vehicle_plate}</p>
                      {order.delivery.picked_up_at && (
                        <p className="text-xs text-gray-400 mt-1.5">Picked up: {formatDate(order.delivery.picked_up_at)}</p>
                      )}
                      {order.delivery.delivered_at && (
                        <p className="text-xs text-green-600 mt-0.5">Delivered: {formatDate(order.delivery.delivered_at)}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Not yet assigned</p>
                  )}
                </div>
              </div>

              {/* Route summary (if set) */}
              {hasRoute && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Navigation size={13} className="text-indigo-500" />
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Route</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Pickup</p>
                        <p className="text-sm text-gray-800 leading-snug">{order.pickup_name}</p>
                      </div>
                    </div>
                    <div className="ml-1 w-px h-4 bg-indigo-200" />
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Dropoff</p>
                        <p className="text-sm text-gray-800 leading-snug">{order.dropoff_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order items */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Items</p>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {order.order_items?.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 text-gray-800">{item.product?.name}</td>
                        <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{item.quantity} {item.product?.unit}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={2} className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{formatCurrency(order.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Status history */}
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Clock size={13} className="text-gray-400" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">History</p>
                </div>
                <div className="space-y-3">
                  {order.order_status_histories?.map(h => (
                    <div key={h.id} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
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

            </div>
          </div>

          {/* ── Right: map ── */}
          <div className="flex-1 relative bg-gray-100">
            {hasRoute ? (
              <>
                <OrderMap
                  pickup={{ name: order.pickup_name, lat: order.pickup_lat, lng: order.pickup_lng }}
                  dropoff={{ name: order.dropoff_name, lat: order.dropoff_lat, lng: order.dropoff_lng }}
                />
                {/* Legend */}
                <div className="absolute top-3 left-3 bg-white rounded-xl shadow border border-gray-100 px-3 py-2.5 text-xs space-y-1.5 z-10 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-gray-600">Pickup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-0.5 bg-indigo-400 rounded" style={{ width: 16 }} />
                    <span className="text-gray-600">Route</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-gray-600">Dropoff</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium text-sm">No route set</p>
                  <p className="text-gray-300 text-xs mt-1">Add pickup & dropoff when creating an order</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Edit modal */}
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
          <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-gray-500">Current</span>
            <StatusBadge status={order.status} />
          </div>
          <div>
            <label className="label">Move to</label>
            <div className="grid grid-cols-2 gap-2">
              {nextStatuses.map(s => (
                <button key={s} type="button"
                  onClick={() => { setNewStatus(s); if (s !== 'assigned') setDriverId(''); }}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left
                    ${newStatus === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {ORDER_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          {newStatus === 'assigned' && (
            <div>
              <label className="label">Assign Driver *</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {drivers.map(d => (
                  <button key={d.id} type="button" onClick={() => setDriverId(d.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors
                      ${driverId === d.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{d.user?.name}</p>
                      <p className="text-xs text-gray-500">{d.vehicle_plate || 'No plate'}{d.vehicle_type ? ` · ${d.vehicle_type}` : ''}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.is_available ? 'Available' : 'Busy'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input resize-none" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => { setStatusModal(false); setNewStatus(''); setNote(''); setDriverId(''); }}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={handleStatusUpdate}
              disabled={!newStatus || updating || (newStatus === 'assigned' && !driverId)}>
              {updating ? 'Updating...' : `Confirm${newStatus ? ' — ' + ORDER_STATUS_LABELS[newStatus] : ''}`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

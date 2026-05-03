import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Plus, Truck, Phone, CheckCircle, XCircle, Pencil,
  MapPin, Navigation, LocateFixed,
} from 'lucide-react';
import api from '../lib/api';
import { Spinner, Modal } from '../components/ui';
import toast from 'react-hot-toast';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [38.7578, 9.0222];
const EMPTY = { name: '', phone: '', vehicle_plate: '', vehicle_type: '', latitude: '', longitude: '' };

function locationAge(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function isValidCoord(lat, lng) {
  return lat !== '' && lng !== '' && !isNaN(+lat) && !isNaN(+lng) &&
    +lat >= -90 && +lat <= 90 && +lng >= -180 && +lng <= 180;
}

export default function DriversPage() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false); // GPS in modal
  const [locating, setLocating] = useState(null);       // GPS from card

  async function load() {
    try {
      const { data } = await api.get('/drivers');
      setDrivers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_CENTER,
      zoom: 11,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    return () => {
      Object.values(markers.current).forEach(m => m.remove());
      markers.current = {};
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── Sync markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    const sync = () => {
      Object.keys(markers.current).forEach(id => {
        if (!drivers.find(d => d.id === id)) { markers.current[id].remove(); delete markers.current[id]; }
      });
      drivers.forEach(driver => {
        if (driver.latitude == null || driver.longitude == null) return;
        if (markers.current[driver.id]) { markers.current[driver.id].remove(); delete markers.current[driver.id]; }
        const el = document.createElement('div');
        el.className = 'driver-marker';
        el.innerHTML = `
          <div class="marker-dot ${driver.is_available ? 'available' : 'unavailable'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 5v3h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div class="marker-label">${driver.user?.name?.split(' ')[0] ?? ''}</div>`;
        el.addEventListener('click', () => {
          setSelected(driver.id);
          map.current?.flyTo({ center: [driver.longitude, driver.latitude], zoom: 14, duration: 700 });
        });
        markers.current[driver.id] = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([driver.longitude, driver.latitude])
          .addTo(map.current);
      });
    };
    map.current.loaded() ? sync() : map.current.once('load', sync);
  }, [drivers]);

  const flyTo = useCallback((driver) => {
    if (!map.current || driver.latitude == null) return;
    map.current.flyTo({ center: [driver.longitude, driver.latitude], zoom: 14, duration: 700 });
  }, []);

  // ── GPS from card (quick update, no modal) ────────────────────────────────
  async function updateLocationFromGPS(driver) {
    setLocating(driver.id);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude, longitude } = pos.coords;
      await api.patch(`/drivers/${driver.id}/location`, { latitude, longitude });
      setDrivers(prev => prev.map(d =>
        d.id === driver.id ? { ...d, latitude, longitude, location_updated_at: new Date().toISOString() } : d
      ));
      toast.success('Location updated');
      map.current?.flyTo({ center: [longitude, latitude], zoom: 14, duration: 700 });
    } catch (err) {
      toast.error(err.code === 1 ? 'Location permission denied' : 'Could not get location');
    } finally {
      setLocating(null);
    }
  }

  // ── GPS into modal form ───────────────────────────────────────────────────
  async function fillGPSIntoForm() {
    setGpsLoading(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      setForm(f => ({
        ...f,
        latitude: pos.coords.latitude.toFixed(6),
        longitude: pos.coords.longitude.toFixed(6),
      }));
      toast.success('GPS coordinates filled');
    } catch (err) {
      toast.error(err.code === 1 ? 'Location permission denied' : 'Could not get GPS');
    } finally {
      setGpsLoading(false);
    }
  }

  // ── Modal open/close ──────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  }

  function openEdit(d) {
    setEditing(d);
    setForm({
      name: d.user?.name || '',
      phone: d.user?.phone || '',
      vehicle_plate: d.vehicle_plate || '',
      vehicle_type: d.vehicle_type || '',
      latitude: d.latitude != null ? String(d.latitude) : '',
      longitude: d.longitude != null ? String(d.longitude) : '',
    });
    setModal(true);
  }

  function closeModal() { setModal(false); setEditing(null); }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const hasLocation = isValidCoord(form.latitude, form.longitude);
    const locationPayload = hasLocation
      ? { latitude: +form.latitude, longitude: +form.longitude }
      : {};

    try {
      if (editing) {
        await api.patch(`/drivers/${editing.id}/vehicle`, {
          vehicle_plate: form.vehicle_plate,
          vehicle_type: form.vehicle_type,
          ...locationPayload,
        });
        toast.success('Driver updated');
      } else {
        const { data: ur } = await api.post('/auth/register', {
          name: form.name, phone: form.phone, password: form.phone, role: 'driver',
        });
        await api.post('/drivers', {
          user_id: ur.user.id,
          vehicle_plate: form.vehicle_plate,
          vehicle_type: form.vehicle_type,
          ...locationPayload,
        });
        toast.success('Driver added');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save driver');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(driver) {
    try {
      await api.patch(`/drivers/${driver.id}/availability`, { is_available: !driver.is_available });
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, is_available: !d.is_available } : d));
    } catch {
      toast.error('Failed to update availability');
    }
  }

  const available = drivers.filter(d => d.is_available).length;
  const located = drivers.filter(d => d.latitude != null).length;
  const hasToken = import.meta.env.VITE_MAPBOX_TOKEN?.startsWith('pk.');

  return (
    <>
      <div className="fixed inset-0 lg:left-64 top-0 flex flex-col bg-white z-10">

        {/* Header */}
        <div className="flex-shrink-0 px-4 lg:px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Drivers</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {drivers.length} total · {available} available · {located} on map
            </p>
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Driver
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Driver list */}
          <div className="w-72 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50">
            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : drivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Truck size={36} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No drivers yet</p>
                <p className="text-gray-400 text-sm mt-1">Add drivers to assign deliveries</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {drivers.map(driver => {
                  const isSelected = selected === driver.id;
                  const age = locationAge(driver.location_updated_at);
                  return (
                    <div
                      key={driver.id}
                      onClick={() => { setSelected(driver.id); flyTo(driver); }}
                      className={`rounded-xl p-3.5 cursor-pointer transition-all border
                        ${isSelected
                          ? 'bg-white border-brand-300 shadow-sm ring-1 ring-brand-200'
                          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                    >
                      {/* Name + availability */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                            ${driver.is_available ? 'bg-green-50' : 'bg-gray-100'}`}>
                            <Truck size={16} className={driver.is_available ? 'text-green-600' : 'text-gray-400'} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{driver.user?.name}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Phone size={10} />{driver.user?.phone}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); toggleAvailability(driver); }}
                          className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors
                            ${driver.is_available
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          {driver.is_available ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {driver.is_available ? 'Active' : 'Off'}
                        </button>
                      </div>

                      {/* Vehicle */}
                      {driver.vehicle_plate && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                          <Truck size={11} />
                          {driver.vehicle_plate}{driver.vehicle_type ? ` · ${driver.vehicle_type}` : ''}
                        </div>
                      )}

                      {/* Location row */}
                      <div className="mt-2.5 flex items-center justify-between">
                        {driver.latitude != null ? (
                          <div className="flex items-center gap-1.5 text-xs text-brand-600">
                            <MapPin size={11} />{age ?? `${(+driver.latitude).toFixed(4)}, ${(+driver.longitude).toFixed(4)}`}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-gray-300">
                            <MapPin size={11} />No location
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {/* Quick GPS update */}
                          <button
                            onClick={e => { e.stopPropagation(); updateLocationFromGPS(driver); }}
                            disabled={locating === driver.id}
                            title="Update location via GPS"
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {locating === driver.id
                              ? <span className="w-3.5 h-3.5 border border-brand-400 border-t-transparent rounded-full animate-spin block" />
                              : <Navigation size={13} />}
                          </button>
                          {/* Edit (includes location) */}
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(driver); }}
                            title="Edit driver"
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="flex-1 relative bg-gray-100">
            {hasToken ? (
              <>
                <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
                <div className="absolute top-3 left-3 bg-white rounded-xl shadow border border-gray-100 px-3 py-2.5 text-xs space-y-1.5 z-10 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    <span className="text-gray-600">Unavailable</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm text-center">
                  <MapPin size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">Mapbox token required</p>
                  <p className="text-sm text-gray-500 mt-1 mb-3">
                    Add your public token to <code className="bg-gray-100 px-1 rounded text-xs">frontend/.env</code>
                  </p>
                  <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 text-left text-gray-600 break-all">
                    VITE_MAPBOX_TOKEN=pk.eyJ1...
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editing ? `Edit Driver — ${editing.user?.name}` : 'Add New Driver'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Identity — create only */}
          {!editing && (
            <div className="space-y-3">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input className="input" type="tel" required value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="09xxxxxxxx" />
              </div>
            </div>
          )}

          {/* Vehicle */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Vehicle</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Plate</label>
                <input className="input" value={form.vehicle_plate}
                  onChange={e => setForm({ ...form, vehicle_plate: e.target.value })} placeholder="AA 12345" />
              </div>
              <div>
                <label className="label">Type</label>
                <input className="input" value={form.vehicle_type}
                  onChange={e => setForm({ ...form, vehicle_type: e.target.value })} placeholder="Truck, Van…" />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</p>
              <button
                type="button"
                onClick={fillGPSIntoForm}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
              >
                {gpsLoading
                  ? <span className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin block" />
                  : <LocateFixed size={13} />}
                Use my GPS
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude</label>
                <input
                  className="input font-mono text-sm"
                  value={form.latitude}
                  onChange={e => setForm({ ...form, latitude: e.target.value })}
                  placeholder="9.0222"
                />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  className="input font-mono text-sm"
                  value={form.longitude}
                  onChange={e => setForm({ ...form, longitude: e.target.value })}
                  placeholder="38.7578"
                />
              </div>
            </div>
            {form.latitude && form.longitude && !isValidCoord(form.latitude, form.longitude) && (
              <p className="text-xs text-red-500 mt-1.5">Invalid coordinates</p>
            )}
            {isValidCoord(form.latitude, form.longitude) && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <MapPin size={11} /> Location set · will appear on map
              </p>
            )}
          </div>

          {!editing && (
            <p className="text-xs text-gray-400">Default login password will be the driver's phone number.</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancel</button>
            <button
              type="submit"
              className="btn-primary flex-1 justify-center"
              disabled={saving || (form.latitude && form.longitude && !isValidCoord(form.latitude, form.longitude))}
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

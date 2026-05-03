import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, MapPin, X, Search } from 'lucide-react';
import api from '../lib/api';
import { Spinner } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import toast from 'react-hot-toast';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Debounced Mapbox Geocoding search
function useGeocoder(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
          `?access_token=${MAPBOX_TOKEN}&country=ET&language=en&limit=5&types=place,address,poi,locality,neighborhood`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.features || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query]);

  return { results, loading };
}

function LocationField({ label, color, value, onChange }) {
  const [query, setQuery] = useState(value?.name || '');
  const [open, setOpen] = useState(false);
  const { results, loading } = useGeocoder(open ? query : '');
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(feature) {
    const [lng, lat] = feature.center;
    const name = feature.place_name;
    setQuery(name);
    setOpen(false);
    onChange({ name, lat, lng });
  }

  function clear() {
    setQuery('');
    onChange(null);
    setOpen(false);
  }

  const isSet = !!value;

  return (
    <div ref={ref} className="relative">
      <label className="label">{label}</label>
      <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors
        ${isSet ? `border-${color}-300 bg-${color}-50` : 'border-gray-300 bg-white focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent'}`}>
        <MapPin size={15} className={isSet ? `text-${color}-500` : 'text-gray-400'} />
        <input
          className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
          placeholder={`Search for ${label.toLowerCase()} location…`}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
          onFocus={() => setOpen(true)}
        />
        {loading && <span className="w-3.5 h-3.5 border border-gray-300 border-t-gray-600 rounded-full animate-spin flex-shrink-0" />}
        {(query || isSet) && !loading && (
          <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => select(f)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
            >
              <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.text}</p>
                <p className="text-xs text-gray-400 truncate">{f.place_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isSet && (
        <p className="text-xs text-gray-400 mt-1 truncate">{value.name}</p>
      )}
    </div>
  );
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shopId, setShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickup, setPickup] = useState(null);   // { name, lat, lng }
  const [dropoff, setDropoff] = useState(null); // { name, lat, lng }
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);

  useEffect(() => {
    Promise.all([api.get('/shops'), api.get('/products')])
      .then(([s, p]) => { setShops(s.data); setProducts(p.data); })
      .finally(() => setLoading(false));
  }, []);

  function addItem() { setItems([...items, { product_id: '', quantity: 1 }]); }
  function removeItem(i) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i, field, value) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }
  function getProduct(id) { return products.find(p => p.id === id); }

  const total = items.reduce((sum, item) => {
    const p = getProduct(item.product_id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!shopId) return toast.error('Select a shop');
    if (items.some(i => !i.product_id)) return toast.error('Select a product for each item');

    setSaving(true);
    try {
      const { data } = await api.post('/orders', {
        shop_id: shopId,
        items: items.map(i => ({ product_id: i.product_id, quantity: parseInt(i.quantity) })),
        notes,
        delivery_address: deliveryAddress,
        pickup_name: pickup?.name ?? null,
        pickup_lat:  pickup?.lat  ?? null,
        pickup_lng:  pickup?.lng  ?? null,
        dropoff_name: dropoff?.name ?? null,
        dropoff_lat:  dropoff?.lat  ?? null,
        dropoff_lng:  dropoff?.lng  ?? null,
      });
      toast.success(`Order ${data.order_number} created`);
      navigate(`/orders/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
        <ArrowLeft size={16} /> Back to orders
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-5">New Order</h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Order Details */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Order Details</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Shop *</label>
              <select className="input" required value={shopId} onChange={e => {
                setShopId(e.target.value);
                const shop = shops.find(s => s.id === e.target.value);
                if (shop?.address) setDeliveryAddress(`${shop.address}${shop.subcity ? ', ' + shop.subcity : ''}`);
              }}>
                <option value="">Select a shop</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name} — {s.phone}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Delivery Address</label>
              <input className="input" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Auto-filled from shop" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." />
            </div>
          </div>
        </div>

        {/* Pickup & Dropoff */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">Pickup & Dropoff</h2>
            <span className="text-xs text-gray-400 ml-1">optional</span>
          </div>

          <div className="space-y-3">
            <LocationField
              label="Pickup Location"
              color="green"
              value={pickup}
              onChange={setPickup}
            />

            {/* Visual connector */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="w-px h-4 bg-gray-200" />
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 border-t border-dashed border-gray-200" />
              {pickup && dropoff && (
                <span className="text-xs text-gray-400 flex-shrink-0">Route set</span>
              )}
            </div>

            <LocationField
              label="Dropoff Location"
              color="red"
              value={dropoff}
              onChange={setDropoff}
            />
          </div>
        </div>

        {/* Order Items */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Order Items</h2>
            <button type="button" onClick={addItem} className="btn-secondary text-xs py-1.5">
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, i) => {
              const product = getProduct(item.product_id);
              return (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select className="input" required value={item.product_id}
                      onChange={e => updateItem(i, 'product_id', e.target.value)}>
                      <option value="">Select product</option>
                      {products.filter(p => p.is_active).map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}/{p.unit}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input className="input text-center" type="number" min="1" required
                      value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="w-28 pt-2 text-sm font-medium text-gray-700 text-right">
                    {product ? formatCurrency(product.price * item.quantity) : '—'}
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-2 text-gray-400 hover:text-red-500 mt-0.5">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={() => navigate('/orders')}>Cancel</button>
          <button type="submit" className="btn-primary flex-1 justify-center py-2.5" disabled={saving}>
            {saving ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

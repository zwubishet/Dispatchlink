import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Spinner } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import toast from 'react-hot-toast';

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shopId, setShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);

  useEffect(() => {
    Promise.all([api.get('/shops'), api.get('/products')])
      .then(([s, p]) => { setShops(s.data); setProducts(p.data); })
      .finally(() => setLoading(false));
  }, []);

  function addItem() {
    setItems([...items, { product_id: '', quantity: 1 }]);
  }

  function removeItem(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i, field, value) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function getProduct(id) {
    return products.find(p => p.id === id);
  }

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

      <PageHeader title="New Order" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Shop */}
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
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.phone}</option>
                ))}
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

        {/* Items */}
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
                    <select
                      className="input"
                      required
                      value={item.product_id}
                      onChange={e => updateItem(i, 'product_id', e.target.value)}
                    >
                      <option value="">Select product</option>
                      {products.filter(p => p.is_active).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.price)}/{p.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      className="input text-center"
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', e.target.value)}
                    />
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
            {saving ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

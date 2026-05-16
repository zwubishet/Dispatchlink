import { apiCall } from '../services/api.js';

export async function get_orders({ status, limit = 20 }) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit);

    const data = await apiCall('GET', `/api/orders?${params.toString()}`);

    if (data.orders.length === 0) return 'No orders found.';

    const lines = data.orders.map(o =>
        `#(Id: ${o.id}) | (order_number: ${o.order_number}) | (status: ${o.status}) | (total_amount: ${o.total_amount} birr) | (shop: ${o.shop.name}) | (Location: ${o.shop.address} - ${o.shop.phone})`
    );

    return `Found ${data.total} orders:\n${lines.join('\n')}`;
}

// now write update_order_status yourself
// hint: PATCH /api/orders/:order_id/status
// body: { status, note, driver_id }
export async function update_order_status({ order_id, status, note, driver_id }) {
    const body = { status };                        // ✅ body not query params
    if (note)      body.note = note;
    if (driver_id) body.driver_id = driver_id;

    const data = await apiCall(
        'PATCH',                                    // ✅ PATCH not POST
        `/api/orders/${order_id}/status`,           // ✅ template literal, ends in /status
        body
    );

    return `Order ${order_id} updated to ${status}.`;
}
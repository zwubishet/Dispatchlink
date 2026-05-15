import { apiCall } from '../services/api.js';

export async function get_dashboard_summary() {
    const data = await apiCall('GET', '/api/dashboard/summary');

    return [
        `Orders: ${data.orders.pending} pending, ${data.orders.confirmed} confirmed, ${data.orders.in_transit} in transit, ${data.orders.delivered} delivered.`,
        `Revenue: ${data.revenue.total_revenue} birr total, ${data.revenue.monthly_revenue} birr this month.`,
        `Shops: ${data.shops.active} active out of ${data.shops.total} total.`,
        `Low stock alerts: ${data.low_stock_count} products need restocking.`
    ].join('\n');
}
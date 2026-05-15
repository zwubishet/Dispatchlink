import { get_dashboard_summary } from '../tools/dashboard.js';
import { get_available_drivers } from '../tools/drivers.js';
import { get_inventory_status, adjust_inventory } from '../tools/inventory.js';
import { get_orders, update_order_status } from '../tools/orders.js';

export async function executeTool(name, args) {
     console.log(`\n  [tool] ${name}`, args);
    switch (name) {
        case 'get_dashboard_summary':
            return await get_dashboard_summary();
        case 'get_available_drivers':
            return await get_available_drivers();
        case 'get_inventory_status':
            return await get_inventory_status(args);
        case 'adjust_inventory':
            return await adjust_inventory(args);
        // in executor.js — update the case
        case 'list_orders': 
            return await get_orders(args);
        case 'update_order_status':
            return await update_order_status(args);
        default:
            throw new Error(`Tool not found: ${name}`);
    }
}
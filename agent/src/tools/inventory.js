import {apiCall} from "../services/api.js";

export async function get_inventory_status({low_stock_only= false}) {
    const data = await apiCall("GET", "/api/inventory");
    if(low_stock_only){
        const products = data.filter(p=>p.quantity_available < p.low_stock_threshold)
        if (products.length === 0) return 'No low stock products at the moment.';
        return products.map(p=>`Product: ${p.product} | quantity_available: ${p.quantity_available} | low_stock_threshold: ${p.low_stock_threshold}`).join('\n');
    } else{
        const products = data.map(p=>`Product: ${p.product} | quantity_available: ${p.quantity_available} | low_stock_threshold: ${p.low_stock_threshold}`);
        if (products.length === 0) return 'No products available right now.';
        return products.join('\n');
    }
}

export async function adjust_inventory({product_id, type, quantity, note}) {
    const adjustment = await apiCall("POST", "/api/inventory/adjust", {product_id, movement_type: type, quantity, note});
    return `Inventory adjusted successfully. New quantity_available: ${adjustment.quantity_available}`;
}


export const tools = [
    {
        type: "function",
        function: {
            name: "get_dashboard_summary",
            description: "Fetches a summary of key metrics for the dashboard, including order counts, revenue, shop status, and low stock alerts.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_available_drivers",
            description: "Fetches a list of available drivers with their details.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_inventory_status",
            description: "Retrieves the current inventory status, with an option to filter for low stock products.",
            parameters: {
                type: "object",
                properties: {
                    low_stock_only: {
                        type: "boolean",
                        description: "If true, only returns products that are low in stock."
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "adjust_inventory",
            description: "Adjusts the inventory for a specific product by adding or removing stock.",
            parameters: {
                type: "object",
                properties: {
                    product_id: {
                        type: "string",
                        description: "The ID of the product to adjust."
                    },
                    type: {
                        type: "string",
                        enum: ['in', 'out', 'adjustment'],
                        description: "The type of adjustment, either adding, removing or adjusting stock."
                    },
                    quantity: {
                        type: "integer",
                        description: "The quantity to adjust by."
                    },
                    note: {
                        type: "string",
                        description: "An optional note explaining the reason for the adjustment."
                    }
                },
                required: ["product_id", "type", "quantity"]
            }
        }
    },
    {
    type: "function",
        function: {
            name: "list_orders",
            description: "List orders from the system. Use this when user asks to see, show, or get orders. Filter by status if mentioned.",
            parameters: {
                type: "object",
                properties: {
                    status: {
                        type: "string",
                        enum: ["pending", "confirmed", "assigned", "picked_up", "in_transit", "delivered", "cancelled", "rejected"],
                        description: "Filter orders by their current lifecycle state (e.g., 'pending', 'delivered')."
                    },
                    limit: {
                        type: "integer",
                        description: "How many orders to return. Default is 20."
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_order_status",
            description: "Update the status of a specific order. Call this tool and then immediately give the user a confirmation. Do not call any other tool after this one.",
            parameters: {
                type: "object",
                properties: {
                    order_id: {
                        type: "string",
                        description: "The ID of the order to update."
                    },
                    status: {
                        type: "string",
                        enum: ["confirmed", "assigned", "picked_up", "in_transit", "delivered", "cancelled", "rejected"],
                        description: "The new status for the order (e.g., pending, confirmed, in_transit, delivered)."
                    },
                    note: {
                        type: "string",
                        description: "An optional note explaining the reason for the status update."
                    },
                    driver_id: {
                        type: "string",
                        description: "An optional ID of the driver to assign to the order."
                    }
                },
                required: ["order_id", "status"]
            }
        }
    }
]
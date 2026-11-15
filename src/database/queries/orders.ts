import { query } from '../clients/postgres-client.js';

export type OrderRecord = {
    id: string;
    order_no: string;
    status: string;
    subtotal: string;
    grand_total: string;
};



export async function getOrderById(
    orderId: string,
    sandboxId: string
): Promise<OrderRecord | null> {
    const result = await query<OrderRecord>(
        `SELECT
            id,
            order_no,
            status,
            subtotal,
            grand_total
        FROM orders
        WHERE id = $1
        AND sandbox_id = $2`,
        [orderId, sandboxId]
    );

    return result[0] ?? null;
}


export type OrderItemRecord = {
    order_id: string;
    name_snapshot: string;
    qty: number;
    unit_price: string;
    line_total: string;
    sku: string;
};

export async function getOrderItemsByOrderId(
    orderId: string,
    sandboxId: string
): Promise<OrderItemRecord[]> {
    return query<OrderItemRecord>(
        `SELECT
            oi.order_id,
            oi.name_snapshot,
            oi.qty,
            oi.unit_price,
            oi.line_total,
            pv.sku
        FROM order_items oi
        JOIN product_variants pv
            ON pv.id = oi.variant_id
            AND pv.sandbox_id = oi.sandbox_id
        WHERE oi.order_id = $1
        AND oi.sandbox_id = $2`,
        [orderId, sandboxId]
    );
}



export type InventoryRecord = {
    variant_id: string;
    sku: string;
    stock_qty: number;
    reserved_qty: number;
    available: number;
};

export async function getInventoryByVariantId(
    variantId: string,
    sandboxId: string
): Promise<InventoryRecord | null> {
    const result = await query<InventoryRecord>(
        `SELECT
            pv.id AS variant_id,
            pv.sku,
            i.stock_qty,
            i.reserved_qty,
            i.stock_qty - i.reserved_qty AS available
        FROM inventory i
        JOIN product_variants pv
            ON pv.id = i.variant_id
            AND pv.sandbox_id = i.sandbox_id
        WHERE i.variant_id = $1
        AND i.sandbox_id = $2`,
        [variantId, sandboxId]
    );

    return result[0] ?? null;
}

export type OrderFinancialSummary = {
    subtotal: string;
    discount_total: string;
    shipping_total: string;
    grand_total: string;
    items_subtotal: string;
};

export async function getOrderFinancialSummary(
    orderId: string,
    sandboxId: string
): Promise<OrderFinancialSummary | null> {
    const result = await query<OrderFinancialSummary>(
        `SELECT
            o.subtotal,
            o.discount_total,
            o.shipping_total,
            o.grand_total,
            (
                SELECT COALESCE(SUM(oi.line_total), 0)
                FROM order_items oi
                WHERE oi.order_id = o.id
                AND oi.sandbox_id = o.sandbox_id
            ) AS items_subtotal
        FROM orders o
        WHERE o.id = $1
        AND o.sandbox_id = $2`,
        [orderId, sandboxId]
    );

    return result[0] ?? null;
}

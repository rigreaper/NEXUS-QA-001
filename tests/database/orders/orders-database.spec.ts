import { test, expect } from '@playwright/test';
import { closeDatabase } from '../../../src/database/clients/postgres-client.js';
import {
    getOrderById,
    getOrderItemsByOrderId,
    getInventoryByVariantId
} from '../../../src/database/queries/orders.js';

test('NEXUS-QA can retrieve an order from PostgreSQL', async () => {
    
    const order = await getOrderById(
        '113613',
        '250bce88-208e-4181-b31b-30c003e80db8'
    );

    expect(order).not.toBeNull();
    expect(order?.id).toBe('113613');
    expect(order?.order_no).toBe('ORD-1151');
    expect(order?.status).toBe('cancelled');
    expect(Number(order?.grand_total)).toBe(182.89);
});


test('NEXUS-QA can retrieve order items from PostgreSQL', async () => {
    
    const items = await getOrderItemsByOrderId(
        '113613',
        '250bce88-208e-4181-b31b-30c003e80db8'
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.order_id).toBe('113613');
    expect(items[0]?.name_snapshot).toBe('Slim Fit Red Shirt');
    expect(items[0]?.sku).toBe('SKU-0001-M');
    expect(items[0]?.qty).toBe(1);
    expect(Number(items[0]?.unit_price)).toBe(152.99);
    expect(Number(items[0]?.line_total)).toBe(152.99);
});


test('NEXUS-QA can retrieve inventory from PostgreSQL', async () => {
    
    const inventory = await getInventoryByVariantId(
        '271963',
        '250bce88-208e-4181-b31b-30c003e80db8'
    );

    expect(inventory).not.toBeNull();
    expect(inventory?.variant_id).toBe('271963');
    expect(inventory?.sku).toBe('SKU-0001-M');
    expect(inventory?.stock_qty).toBe(35);
    expect(inventory?.reserved_qty).toBe(0);
    expect(inventory?.available).toBe(35);

});



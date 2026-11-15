import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/api.fixture.js';
import {
    getOrderById,
    getOrderItemsByOrderId,
    getInventoryByVariantId,
} from '../../../src/database/queries/orders.js';

type DemoUser = {
    email: string;
    password: string;
};

type ApiVariant = {
    id: number | string;
    sku: string;
    stock_qty: number;
    available: number;
};

type ApiOrder = {
    id: number | string;
    order_no: string;
    status: string;
    grand_total: number;
};

async function getAvailableVariant(api: APIRequestContext): Promise<ApiVariant> {
    const productsResponse = await api.get('/api/v1/products?page=1&size=1');
    expect(productsResponse.status()).toBe(200);

    const productsBody = await productsResponse.json() as {
        items: Array<{ id: number | string }>;
    };
    const product = productsBody.items[0];
    expect(product).toBeTruthy();
    if (!product) {
        throw new Error('The product list returned no products for the sandbox.');
    }

    const variantsResponse = await api.get(
        `/api/v1/products/${product.id}/variants`
    );
    expect(variantsResponse.status()).toBe(200);

    const variantsBody = await variantsResponse.json() as {
        variants: ApiVariant[];
    };
    const variant = variantsBody.variants.find(item => item.available >= 1);
    expect(variant).toBeTruthy();

    return variant!;
}

async function createPlacedOrder(
    api: APIRequestContext,
    demoUser: DemoUser
): Promise<{ order: ApiOrder; token: string }> {
    const loginResponse = await api.post('/api/v1/auth/login', {
        data: demoUser,
    });
    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json() as { token: string };
    expect(loginBody.token).toBeTruthy();

    const authorization = {
        Authorization: `Bearer ${loginBody.token}`,
    };

    const cartResponse = await api.post('/api/v1/carts', {
        headers: authorization,
    });
    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json() as {
        cart: { id: number | string };
    };
    const variant = await getAvailableVariant(api);

    const addItemResponse = await api.post(
        `/api/v1/carts/${cartBody.cart.id}/items`,
        {
            headers: authorization,
            data: {
                variantId: variant.id,
                qty: 1,
            },
        }
    );
    expect(addItemResponse.status()).toBe(201);

    const checkoutResponse = await api.post('/api/v1/orders', {
        headers: authorization,
        data: {
            cartId: cartBody.cart.id,
        },
    });
    expect(checkoutResponse.status()).toBe(201);

    const checkoutBody = await checkoutResponse.json() as { order: ApiOrder };
    return {
        order: checkoutBody.order,
        token: loginBody.token,
    };
}

test('NEXUS-QA can retrieve an order from PostgreSQL', async ({ api, sandbox }) => {
    const { order, token } = await createPlacedOrder(api, sandbox.demoUser);

    const cancellationResponse = await api.post(
        `/api/v1/orders/${order.id}/cancel`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    expect(cancellationResponse.status()).toBe(200);

    const cancellationBody = await cancellationResponse.json() as {
        order: ApiOrder;
    };
    expect(cancellationBody.order.id).toBe(order.id);
    expect(cancellationBody.order.status).toBe('cancelled');

    const databaseOrder = await getOrderById(
        String(order.id),
        sandbox.sandboxId
    );

    expect(databaseOrder).not.toBeNull();
    expect(databaseOrder?.id).toBe(String(order.id));
    expect(databaseOrder?.order_no).toBe(order.order_no);
    expect(databaseOrder?.status).toBe(cancellationBody.order.status);
    expect(Number(databaseOrder?.grand_total)).toBeCloseTo(
        cancellationBody.order.grand_total,
        2
    );
});

test('NEXUS-QA can retrieve order items from PostgreSQL', async ({ api, sandbox }) => {
    const { order, token } = await createPlacedOrder(api, sandbox.demoUser);

    const orderDetailsResponse = await api.get(
        `/api/v1/orders/${order.id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    expect(orderDetailsResponse.status()).toBe(200);

    const orderDetails = await orderDetailsResponse.json() as {
        items: Array<{
            name_snapshot: string;
            qty: number;
            unit_price: number;
            line_total: number;
            variant_sku: string;
        }>;
    };
    const databaseItems = await getOrderItemsByOrderId(
        String(order.id),
        sandbox.sandboxId
    );

    expect(orderDetails.items).toHaveLength(1);
    expect(databaseItems).toHaveLength(orderDetails.items.length);

    const databaseItem = databaseItems[0]!;
    const apiItem = orderDetails.items[0]!;

    expect(databaseItem.order_id).toBe(String(order.id));
    expect(databaseItem.name_snapshot).toBe(apiItem.name_snapshot);
    expect(databaseItem.sku).toBe(apiItem.variant_sku);
    expect(databaseItem.qty).toBe(1);
    expect(databaseItem.qty).toBe(apiItem.qty);
    expect(Number(databaseItem.unit_price)).toBeCloseTo(apiItem.unit_price, 2);
    expect(Number(databaseItem.line_total)).toBeCloseTo(apiItem.line_total, 2);
});

test('NEXUS-QA can retrieve inventory from PostgreSQL', async ({ api, sandbox }) => {
    const variant = await getAvailableVariant(api);

    const inventory = await getInventoryByVariantId(
        String(variant.id),
        sandbox.sandboxId
    );

    expect(inventory).not.toBeNull();
    expect(inventory?.variant_id).toBe(String(variant.id));
    expect(inventory?.sku).toBe(variant.sku);
    expect(inventory?.stock_qty).toBe(variant.stock_qty);
    expect(inventory?.reserved_qty).toBe(variant.stock_qty - variant.available);
    expect(inventory?.available).toBe(variant.available);
});

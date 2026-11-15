import { test, expect } from '../../../src/fixtures/api.fixture.js';


test('guest can apply a valid percentage coupon', async ({ api }) => {
    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=1'
    );

    const productsBody = await productsResponse.json();
    const productId = productsBody.items[0].id;

    const variantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    const variantsBody = await variantsResponse.json();

    const availableVariant = variantsBody.variants.find(
        (variant: { available: number }) => variant.available > 0
    );

    expect(availableVariant).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts');
    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(addResponse.status()).toBe(201);

    const couponResponse = await api.post(
        `/api/v1/carts/${cartId}/coupon`,
        {
            data: {
                code: 'WELCOME10',
            },
        }
    );

    expect(couponResponse.status()).toBe(200);

    const couponBody = await couponResponse.json();

    expect(couponBody.cart.couponCode).toBe('WELCOME10');
    expect(couponBody.totals.discount_total).toBeGreaterThan(0);
    expect(couponBody.totals.grand_total).toBe(
        couponBody.totals.subtotal -
        couponBody.totals.discount_total +
        couponBody.totals.shipping_total
    );
});

test('cart rejects an unknown coupon code', async ({ api }) => {
    const cartResponse = await api.post('/api/v1/carts');
    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const response = await api.post(
        `/api/v1/carts/${cartId}/coupon`,
        {
            data: {
                code: 'INVALID_COUPON_XYZ',
            },
        }
    );

    expect(response.status()).toBe(422);

    const body = await response.json();

    expect(body.error.code).toBe('COUPON_NOT_FOUND');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('cart rejects a coupon that has not started', async ({ api }) => {
    const cartResponse = await api.post('/api/v1/carts');
    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const response = await api.post(
        `/api/v1/carts/${cartId}/coupon`,
        {
            data: {
                code: 'FUTURE15',
            },
        }
    );

    expect(response.status()).toBe(422);

    const body = await response.json();

    expect(body.error.code).toBe('COUPON_NOT_STARTED');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});


test('cart rejects an expired coupon', async ({ api }) => {
    const cartResponse = await api.post('/api/v1/carts');
    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const response = await api.post(
        `/api/v1/carts/${cartId}/coupon`,
        {
            data: {
                code: 'EXPIRED20',
            },
        }
    );

    expect(response.status()).toBe(422);

    const body = await response.json();

    expect(body.error.code).toBe('COUPON_EXPIRED');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('cart rejects a coupon that reached its usage limit', async ({ api }) => {
    const cartResponse = await api.post('/api/v1/carts');
    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const response = await api.post(
        `/api/v1/carts/${cartId}/coupon`,
        {
            data: {
                code: 'MAXEDOUT',
            },
        }
    );

    expect(response.status()).toBe(422);

    const body = await response.json();

    expect(body.error.code).toBe('COUPON_USAGE_LIMIT_REACHED');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('cart rejects a coupon when minimum subtotal is not met', async ({ api }) => {
    const cartResponse = await api.post('/api/v1/carts');
    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const response = await api.post(
        `/api/v1/carts/${cartId}/coupon`,
        {
            data: {
                code: 'VIP1000',
            },
        }
    );

    expect(response.status()).toBe(422);

    const body = await response.json();

    expect(body.error.code).toBe('COUPON_MIN_TOTAL_NOT_MET');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});
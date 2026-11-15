
import { test, expect } from '../../../src/fixtures/api.fixture.js';

test('authenticated customer can checkout a valid cart', async ({ api, sandbox }) => {
    const loginResponse = await api.post('/api/v1/auth/login', {
        data: sandbox.demoUser,
    });

    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    const token = loginBody.token;

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=1'
    );

    expect(productsResponse.status()).toBe(200);

    const productsBody = await productsResponse.json();
    const productId = productsBody.items[0].id;

    const variantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(variantsResponse.status()).toBe(200);

    const variantsBody = await variantsResponse.json();

    const availableVariant = variantsBody.variants.find(
        (variant: { available: number }) => variant.available >= 1
    );

    expect(availableVariant).toBeTruthy();

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(addResponse.status()).toBe(201);

    const addBody = await addResponse.json();

    const cartTotals = addBody.totals;
    const initialStockQty = addBody.items[0].stock_qty;
    const initialAvailable = addBody.items[0].available;
    const orderedQty = addBody.items[0].qty;

    const checkoutResponse = await api.post('/api/v1/orders', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        data: {
            cartId,
        },
    });

    expect(checkoutResponse.status()).toBe(201);

    const checkoutBody = await checkoutResponse.json();
    const order = checkoutBody.order;

    expect(order.id).toBeTruthy();
    expect(order.order_no).toBeTruthy();
    expect(order.status).toBe('placed');
    expect(order.subtotal).toBeGreaterThan(0);
    expect(order.grand_total).toBeGreaterThan(0);
    expect(order.placed_at).toBeTruthy();

    expect(order.subtotal).toBe(cartTotals.subtotal);
    expect(order.discount_total).toBe(cartTotals.discount_total);
    expect(order.shipping_total).toBe(cartTotals.shipping_total);
    expect(order.grand_total).toBe(cartTotals.grand_total);

    const updatedCartResponse = await api.get(
        `/api/v1/carts/${cartId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    expect(updatedCartResponse.status()).toBe(200);

    const updatedCartBody = await updatedCartResponse.json();

    expect(updatedCartBody.cart.status).toBe('converted');

    const updatedVariantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(updatedVariantsResponse.status()).toBe(200);

    const updatedVariantsBody = await updatedVariantsResponse.json();

    const updatedVariant = updatedVariantsBody.variants.find(
        (variant: { id: number }) => variant.id === availableVariant.id
    );

    expect(updatedVariant).toBeTruthy();
    expect(updatedVariant.stock_qty).toBe(initialStockQty - orderedQty);
    expect(updatedVariant.available).toBe(initialAvailable);

    const orderDetailsResponse = await api.get(
        `/api/v1/orders/${order.id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    expect(orderDetailsResponse.status()).toBe(200);

    const orderDetailsBody = await orderDetailsResponse.json();

    //console.log(JSON.stringify(orderDetailsBody, null, 2));
    
    const orderDetails = orderDetailsBody.order;
    const orderItems = orderDetailsBody.items;

    expect(orderDetails.id).toBe(order.id);
    expect(orderDetails.order_no).toBe(order.order_no);
    expect(orderDetails.user_id).toBe(loginBody.user.id);
    expect(orderDetails.status).toBe('placed');

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].variant_id).toBe(availableVariant.id);
    expect(orderItems[0].qty).toBe(orderedQty);
    expect(orderItems[0].unit_price).toBe(cartTotals.subtotal);
    expect(orderItems[0].line_total).toBe(cartTotals.subtotal);
    expect(orderItems[0].name_snapshot).toBeTruthy();
    expect(orderItems[0].variant_sku).toBeTruthy();

    expect(orderDetailsBody.payments).toHaveLength(0);
    expect(orderDetailsBody.shipments).toHaveLength(0);

    const ordersResponse = await api.get('/api/v1/orders', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(ordersResponse.status()).toBe(200);

    const ordersBody = await ordersResponse.json();

    //console.log(JSON.stringify(ordersBody, null, 2));

    expect(ordersBody.page).toBe(1);
    expect(ordersBody.size).toBe(20);
    expect(ordersBody.total).toBeGreaterThan(0);
    expect(ordersBody.totalPages).toBeGreaterThan(0);
    expect(ordersBody.hasNext).toBe(false);

    const listedOrder = ordersBody.items.find(
        (item: { id: number }) => item.id === order.id
    );

    expect(listedOrder).toBeTruthy();
    expect(listedOrder.order_no).toBe(order.order_no);
    expect(listedOrder.status).toBe('placed');
    expect(listedOrder.subtotal).toBe(order.subtotal);
    expect(listedOrder.grand_total).toBe(order.grand_total);
    expect(listedOrder.item_count).toBe(1);


    const filteredOrdersResponse = await api.get(
        '/api/v1/orders?status=placed',
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    expect(filteredOrdersResponse.status()).toBe(200);

    const filteredOrdersBody = await filteredOrdersResponse.json();

    expect(filteredOrdersBody.items.length).toBeGreaterThan(0);

    for (const item of filteredOrdersBody.items) {
        expect(item.status).toBe('placed');
    }
    const paginatedResponse = await api.get(
        '/api/v1/orders?page=1&size=1',
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    expect(paginatedResponse.status()).toBe(200);

    const paginatedBody = await paginatedResponse.json();

    expect(paginatedBody.page).toBe(1);
    expect(paginatedBody.size).toBe(1);
    expect(paginatedBody.items).toHaveLength(1);
    expect(paginatedBody.total).toBeGreaterThanOrEqual(1);
    expect(paginatedBody.totalPages).toBeGreaterThanOrEqual(1);



});


test('customer cannot retrieve another customer order', async ({ api, sandbox }) => {
    const firstLoginResponse = await api.post('/api/v1/auth/login', {
        data: sandbox.demoUser,
    });

    expect(firstLoginResponse.status()).toBe(200);

    const firstLoginBody = await firstLoginResponse.json();
    const firstToken = firstLoginBody.token;

    const secondEmail = `nexus-${Date.now()}@example.com`;
    const secondPassword = 'Password123!';

    const registerResponse = await api.post('/api/v1/auth/register', {
        data: {
            email: secondEmail,
            password: secondPassword,
            name: 'Nexus Second User',
        },
    });

    expect(registerResponse.status()).toBe(201);

    const secondLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: secondEmail,
            password: secondPassword,
        },
    });

    expect(secondLoginResponse.status()).toBe(200);

    const secondLoginBody = await secondLoginResponse.json();
    const secondToken = secondLoginBody.token;

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${firstToken}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=1'
    );

    expect(productsResponse.status()).toBe(200);

    const productsBody = await productsResponse.json();
    const productId = productsBody.items[0].id;

    const variantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(variantsResponse.status()).toBe(200);

    const variantsBody = await variantsResponse.json();

    const availableVariant = variantsBody.variants.find(
        (variant: { available: number }) => variant.available >= 1
    );

    expect(availableVariant).toBeTruthy();

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            headers: {
                Authorization: `Bearer ${firstToken}`,
            },
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(addResponse.status()).toBe(201);

    const checkoutResponse = await api.post('/api/v1/orders', {
        headers: {
            Authorization: `Bearer ${firstToken}`,
        },
        data: {
            cartId,
        },
    });

    expect(checkoutResponse.status()).toBe(201);

    const checkoutBody = await checkoutResponse.json();
    const orderId = checkoutBody.order.id;

    const unauthorizedResponse = await api.get(
        `/api/v1/orders/${orderId}`,
        {
            headers: {
                Authorization: `Bearer ${secondToken}`,
            },
        }
    );

    expect(unauthorizedResponse.status()).toBe(403);

    const secondUserOrdersResponse = await api.get('/api/v1/orders', {
        headers: {
            Authorization: `Bearer ${secondToken}`,
        },
    });

    expect(secondUserOrdersResponse.status()).toBe(200);

    const secondUserOrdersBody = await secondUserOrdersResponse.json();

    const leakedOrder = secondUserOrdersBody.items.find(
        (item: { id: number }) => item.id === orderId
    );

    expect(leakedOrder).toBeUndefined();

});


test('customer cannot checkout an empty cart', async ({ api, sandbox }) => {
    const loginResponse = await api.post('/api/v1/auth/login', {
        data: sandbox.demoUser,
    });

    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    const token = loginBody.token;

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const checkoutResponse = await api.post('/api/v1/orders', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        data: {
            cartId,
        },
    });

    expect(checkoutResponse.status()).toBe(422);

    const checkoutBody = await checkoutResponse.json();

    expect(checkoutBody.error.code).toBe('EMPTY_CART');
});


test('customer cannot checkout another customer cart', async ({ api, sandbox }) => {
    const firstLoginResponse = await api.post('/api/v1/auth/login', {
        data: sandbox.demoUser,
    });

    expect(firstLoginResponse.status()).toBe(200);

    const firstLoginBody = await firstLoginResponse.json();
    const firstToken = firstLoginBody.token;

    const secondEmail = `nexus-${Date.now()}@example.com`;
    const secondPassword = 'Password123!';

    const registerResponse = await api.post('/api/v1/auth/register', {
        data: {
            email: secondEmail,
            password: secondPassword,
            name: 'Nexus Second User',
        },
    });

    expect(registerResponse.status()).toBe(201);

    const secondLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: secondEmail,
            password: secondPassword,
        },
    });

    expect(secondLoginResponse.status()).toBe(200);

    const secondLoginBody = await secondLoginResponse.json();
    const secondToken = secondLoginBody.token;

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${firstToken}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const checkoutResponse = await api.post('/api/v1/orders', {
        headers: {
            Authorization: `Bearer ${secondToken}`,
        },
        data: {
            cartId,
        },
    });

    expect(checkoutResponse.status()).toBe(403);
});



test('customer can cancel a placed order and restore stock', async ({ api, sandbox }) => {
    const loginResponse = await api.post('/api/v1/auth/login', {
        data: sandbox.demoUser,
    });

    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    const token = loginBody.token;

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=1'
    );

    expect(productsResponse.status()).toBe(200);

    const productsBody = await productsResponse.json();
    const productId = productsBody.items[0].id;

    const variantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(variantsResponse.status()).toBe(200);

    const variantsBody = await variantsResponse.json();

    const availableVariant = variantsBody.variants.find(
        (variant: { available: number }) => variant.available >= 1
    );

    expect(availableVariant).toBeTruthy();

    const initialStockQty = availableVariant.stock_qty;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(addResponse.status()).toBe(201);

    const checkoutResponse = await api.post('/api/v1/orders', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        data: {
            cartId,
        },
    });

    expect(checkoutResponse.status()).toBe(201);

    const checkoutBody = await checkoutResponse.json();
    const orderId = checkoutBody.order.id;

    const cancellationResponse = await api.post(
        `/api/v1/orders/${orderId}/cancel`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    expect(cancellationResponse.status()).toBe(200);

    const cancellationBody = await cancellationResponse.json();

    // console.log(JSON.stringify(cancellationBody, null, 2));

    expect(cancellationBody.order.id).toBe(orderId);
    expect(cancellationBody.order.status).toBe('cancelled');
    expect(cancellationBody.order.grand_total).toBeGreaterThan(0);

    const cancelledOrderResponse = await api.get(
        `/api/v1/orders/${orderId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    expect(cancelledOrderResponse.status()).toBe(200);

    const cancelledOrderBody = await cancelledOrderResponse.json();

    expect(cancelledOrderBody.order.status).toBe('cancelled');

    const restoredVariantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(restoredVariantsResponse.status()).toBe(200);

    const restoredVariantsBody = await restoredVariantsResponse.json();

    const restoredVariant = restoredVariantsBody.variants.find(
        (variant: { id: number }) => variant.id === availableVariant.id
    );

    expect(restoredVariant).toBeTruthy();
    expect(restoredVariant.stock_qty).toBe(initialStockQty);
    expect(restoredVariant.available).toBe(availableVariant.available);

});

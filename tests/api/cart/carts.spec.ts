import { test, expect } from '../../../src/fixtures/api.fixture.js';

test('guest can create a cart', async ({ api }) => {
    const response = await api.post('/api/v1/carts');

    expect(response.status()).toBe(201);

    const body = await response.json();

    expect(body.cart.id).toBeGreaterThan(0);
    expect(body.cart.user_id).toBeNull();
    expect(body.cart.guest_token).toBeTruthy();
    expect(body.cart.status).toBe('open');
    expect(Date.parse(body.cart.created_at)).not.toBeNaN();
});

test('guest can retrieve an empty cart', async ({ api }) => {
    const createResponse = await api.post('/api/v1/carts');

    expect(createResponse.status()).toBe(201);

    const createBody = await createResponse.json();
    const cartId = createBody.cart.id;

    const response = await api.get(`/api/v1/carts/${cartId}`);

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.cart.id).toBe(cartId);
    expect(body.cart.userId).toBeNull();
    expect(body.cart.status).toBe('open');
    expect(body.cart.couponCode).toBeNull();

    expect(body.items).toHaveLength(0);
    expect(body.itemCount).toBe(0);

    expect(body.totals.subtotal).toBe(0);
    expect(body.totals.discount_total).toBe(0);
    expect(body.totals.shipping_total).toBeGreaterThanOrEqual(0);
    expect(body.totals.grand_total).toBe(
        body.totals.subtotal -
        body.totals.discount_total +
        body.totals.shipping_total
    );

    expect(body.warnings).toEqual({});
});

test('guest can add a product to cart and reserve stock', async ({
    api,
}) => {

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
        (variant: { available: number }) => variant.available >= 2
    );

    expect(availableVariant).toBeTruthy();

    const initialAvailable = availableVariant.available;
    const quantity = 2;

    const cartResponse = await api.post('/api/v1/carts');

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: quantity,
            },
        }
    );

    expect(addResponse.status()).toBe(201);

    const addBody = await addResponse.json();

    expect(addBody.items).toHaveLength(1);
    expect(addBody.items[0].variant_id).toBe(availableVariant.id);
    expect(addBody.items[0].qty).toBe(quantity);
    expect(addBody.items[0].product_id).toBe(productId);

    expect(addBody.itemCount).toBe(quantity);

    expect(addBody.items[0].line_total).toBe(
        addBody.items[0].unit_price * quantity
    );

    expect(addBody.totals.subtotal).toBe(
        addBody.items[0].line_total
    );

    expect(addBody.totals.grand_total).toBe(
        addBody.totals.subtotal -
        addBody.totals.discount_total +
        addBody.totals.shipping_total
    );

    const updatedVariantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(updatedVariantsResponse.status()).toBe(200);

    const updatedVariantsBody = await updatedVariantsResponse.json();

    const updatedVariant = updatedVariantsBody.variants.find(
        (variant: { id: number }) =>
            variant.id === availableVariant.id
    );

    expect(updatedVariant.available).toBe(
        initialAvailable - quantity
    );
});

test('adding the same variant twice increases quantity in one cart line', async ({
    api,
}) => {
   
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
        (variant: { available: number }) => variant.available >= 2
    );

    expect(availableVariant).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts');

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const firstResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(firstResponse.status()).toBe(201);

    const secondResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(secondResponse.status()).toBe(201);

    const secondBody = await secondResponse.json();

    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0].variant_id).toBe(availableVariant.id);
    expect(secondBody.items[0].qty).toBe(2);
    expect(secondBody.itemCount).toBe(2);
});

test('guest can update cart item quantity', async ({ api }) => {
  
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
        (variant: { available: number }) => variant.available >= 3
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

    const addBody = await addResponse.json();
    const itemId = addBody.items[0].id;

    const updateResponse = await api.patch(
        `/api/v1/carts/${cartId}/items/${itemId}`,
        {
            data: {
                qty: 3,
            },
        }
    );

    expect(updateResponse.status()).toBe(200);

    const updateBody = await updateResponse.json();

    expect(updateBody.items).toHaveLength(1);
    expect(updateBody.items[0].id).toBe(itemId);
    expect(updateBody.items[0].qty).toBe(3);
    expect(updateBody.itemCount).toBe(3);

    expect(updateBody.items[0].line_total).toBe(
        updateBody.items[0].unit_price * 3
    );

    expect(updateBody.totals.subtotal).toBe(
        updateBody.items[0].line_total
    );
});

test('cart rejects zero quantity when updating an item', async ({
    api,
}) => {

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

    const addBody = await addResponse.json();
    const itemId = addBody.items[0].id;

    const updateResponse = await api.patch(
        `/api/v1/carts/${cartId}/items/${itemId}`,
        {
            data: {
                qty: 0,
            },
        }
    );

    expect(updateResponse.status()).toBe(422);

    const errorBody = await updateResponse.json();

    expect(errorBody.error.code).toBe('INVALID_QTY');
    expect(errorBody.error.message).toBeTruthy();
    expect(errorBody.correlationId).toBeTruthy();
});

test('guest can remove an item from cart', async ({ api }) => {
   
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

    const addBody = await addResponse.json();
    const itemId = addBody.items[0].id;

    const deleteResponse = await api.delete(
        `/api/v1/carts/${cartId}/items/${itemId}`
    );

    expect(deleteResponse.status()).toBe(204);

    const updatedCartResponse = await api.get(
        `/api/v1/carts/${cartId}`
    );

    expect(updatedCartResponse.status()).toBe(200);

    const updatedCartBody = await updatedCartResponse.json();

    expect(updatedCartBody.items).toHaveLength(0);
    expect(updatedCartBody.itemCount).toBe(0);
    expect(updatedCartBody.totals.subtotal).toBe(0);
    expect(updatedCartBody.totals.discount_total).toBe(0);
});

test('removing a cart item releases reserved stock', async ({ api }) => {
   
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

    const initialAvailable = availableVariant.available;

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

    const addBody = await addResponse.json();
    const itemId = addBody.items[0].id;

    const reservedResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    const reservedBody = await reservedResponse.json();

    const reservedVariant = reservedBody.variants.find(
        (variant: { id: number }) =>
            variant.id === availableVariant.id
    );

    expect(reservedVariant.available).toBe(initialAvailable - 1);

    const deleteResponse = await api.delete(
        `/api/v1/carts/${cartId}/items/${itemId}`
    );

    expect(deleteResponse.status()).toBe(204);

    const restoredResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    const restoredBody = await restoredResponse.json();

    const restoredVariant = restoredBody.variants.find(
        (variant: { id: number }) =>
            variant.id === availableVariant.id
    );

    expect(restoredVariant.available).toBe(initialAvailable);
});


test('cart rejects zero quantity when adding an item', async ({ api }) => {
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
        (variant: { available: number }) => variant.available > 0
    );

    expect(availableVariant).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts');

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: 0,
            },
        }
    );

    expect(addResponse.status()).toBe(422);

    const errorBody = await addResponse.json();

    expect(errorBody.error.code).toBe('INVALID_QTY');
    expect(errorBody.error.message).toBeTruthy();
    expect(errorBody.correlationId).toBeTruthy();

    const verifyResponse = await api.get(
        `/api/v1/carts/${cartId}`
    );

    expect(verifyResponse.status()).toBe(200);

    const verifyBody = await verifyResponse.json();

    expect(verifyBody.items).toHaveLength(0);
    expect(verifyBody.itemCount).toBe(0);
});


test('cart rejects negative quantity when adding an item', async ({ api }) => {
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
        (variant: { available: number }) => variant.available > 0
    );

    expect(availableVariant).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts');

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: -1,
            },
        }
    );

    expect(addResponse.status()).toBe(422);

    const errorBody = await addResponse.json();

    expect(errorBody.error.code).toBe('INVALID_QTY');
    expect(errorBody.error.message).toBeTruthy();
    expect(errorBody.correlationId).toBeTruthy();

    const verifyResponse = await api.get(
        `/api/v1/carts/${cartId}`
    );

    expect(verifyResponse.status()).toBe(200);

    const verifyBody = await verifyResponse.json();

    expect(verifyBody.items).toHaveLength(0);
    expect(verifyBody.itemCount).toBe(0);
});


test('cart allows adding exactly the available stock quantity', async ({ api }) => {
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
        (variant: { available: number }) => variant.available >= 2
    );

    expect(availableVariant).toBeTruthy();

    const availableQuantity = availableVariant.available;

    const cartResponse = await api.post('/api/v1/carts');

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: availableQuantity,
            },
        }
    );

    expect(addResponse.status()).toBe(201);

    const addBody = await addResponse.json();

    expect(addBody.items).toHaveLength(1);
    expect(addBody.items[0].qty).toBe(availableQuantity);
    expect(addBody.items[0].available).toBe(0);

    const updatedVariantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(updatedVariantsResponse.status()).toBe(200);

    const updatedVariantsBody = await updatedVariantsResponse.json();

    const updatedVariant = updatedVariantsBody.variants.find(
        (variant: { id: number }) => variant.id === availableVariant.id
    );

    expect(updatedVariant.available).toBe(0);
});


test('cart rejects quantity exceeding available stock', async ({ api }) => {
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

    const availableQuantity = availableVariant.available;

    const cartResponse = await api.post('/api/v1/carts');

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: availableQuantity + 1,
            },
        }
    );

    expect(addResponse.status()).toBe(409);

    const errorBody = await addResponse.json();

    expect(errorBody.error.code).toBe('OUT_OF_STOCK');
    expect(errorBody.error.message).toBeTruthy();
    expect(errorBody.correlationId).toBeTruthy();
    expect(errorBody.error.details.available).toBe(availableQuantity);

    const verifyResponse = await api.get(
        `/api/v1/carts/${cartId}`
    );

    expect(verifyResponse.status()).toBe(200);

    const verifyBody = await verifyResponse.json();

    expect(verifyBody.items).toHaveLength(0);
    expect(verifyBody.itemCount).toBe(0);

    const updatedVariantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(updatedVariantsResponse.status()).toBe(200);

    const updatedVariantsBody = await updatedVariantsResponse.json();

    const updatedVariant = updatedVariantsBody.variants.find(
        (variant: { id: number }) => variant.id === availableVariant.id
    );

    expect(updatedVariant.available).toBe(availableQuantity);
});



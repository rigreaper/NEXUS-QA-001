import { test, expect } from '../../../src/fixtures/api.fixture.js';

// test('inspect product detail response', async ({ api }) => {

//     const listResponse = await api.get('/api/v1/products');

//     expect(listResponse.status()).toBe(200);

//     const listBody = await listResponse.json();
//     const productId = listBody.items[0].id;

//     const response = await api.get(`/api/v1/products/${productId}`);

//     console.log('Product ID:', productId);
//     console.log('Status:', response.status());
//     console.log('Body:', await response.json());
// });

test('user can retrieve product details', async ({ api }) => {
    const listResponse = await api.get('/api/v1/products');

    expect(listResponse.status()).toBe(200);

    const listBody = await listResponse.json();
    const selectedProduct = listBody.items[0];

    const response = await api.get(
        `/api/v1/products/${selectedProduct.id}`
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const product = body.product;

    expect(product.id).toBe(selectedProduct.id);
    expect(product.sku).toBe(selectedProduct.sku);
    expect(product.name).toBe(selectedProduct.name);
    expect(product.price).toBe(selectedProduct.price);
    expect(product.currency).toBe(selectedProduct.currency);
    expect(product.is_active).toBe(selectedProduct.is_active);

    expect(product.description).toBeTruthy();
    expect(product.created_at).toBeTruthy();
    expect(product.category).toBeTruthy();
    expect(product.category_name).toBeTruthy();
    expect(typeof product.rating_avg).toBe('number');
    expect(typeof product.rating_count).toBe('number');
});

test('API returns 404 when product does not exist', async ({ api }) => {
    const response = await api.get('/api/v1/products/999999999');

    expect(response.status()).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});


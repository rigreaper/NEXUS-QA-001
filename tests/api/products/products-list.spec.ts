import { test, expect } from '../../../src/fixtures/api.fixture.js';

test('user can retrieve the product list', async ({ api }) => {
    const response = await api.get('/api/v1/products');

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.page).toBeGreaterThanOrEqual(1);
    expect(body.size).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);
    expect(body.totalPages).toBeGreaterThan(0);

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.length).toBeLessThanOrEqual(body.size);
});


test('user can navigate between product pages', async ({ api }) => {
    const firstPageResponse = await api.get(
        '/api/v1/products?page=1&size=20'
    );

    expect(firstPageResponse.status()).toBe(200);

    const firstPage = await firstPageResponse.json();

    const secondPageResponse = await api.get(
        '/api/v1/products?page=2&size=20'
    );

    expect(secondPageResponse.status()).toBe(200);

    const secondPage = await secondPageResponse.json();

    expect(firstPage.page).toBe(1);
    expect(secondPage.page).toBe(2);

    expect(firstPage.items.length).toBeGreaterThan(0);
    expect(secondPage.items.length).toBeGreaterThan(0);

    const firstPageIds = firstPage.items.map(
        (product: { id: number }) => product.id
    );

    const secondPageIds = secondPage.items.map(
        (product: { id: number }) => product.id
    );

    const overlappingIds = firstPageIds.filter((id: number) =>
        secondPageIds.includes(id)
    );

    expect(overlappingIds).toHaveLength(0);
});


test('API defaults an invalid page number to page 1', async ({ api }) => {
    const response = await api.get(
        '/api/v1/products?page=-1&size=20'
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.page).toBe(1);
    expect(body.size).toBe(20);
    expect(body.items.length).toBeGreaterThan(0);
});

test('API defaults a zero page size to 20', async ({ api }) => {
    const response = await api.get(
        '/api/v1/products?page=1&size=0'
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    // console.log('Status:', response.status());
    // console.log('Body:', await response.json());

    expect(body.page).toBe(1);
    expect(body.size).toBe(20);
    expect(body.items.length).toBe(20);
});

test('API handles an excessively large page size', async ({ api }) => {
    const response = await api.get(
        '/api/v1/products?page=1&size=1000'
    );

    // console.log('Status:', response.status());
    expect(response.status()).toBe(200);

    const body = await response.json();

    // console.log('Returned size:', body.size);
    // console.log('Actual items:', body.items.length);
    // console.log('Total products:', body.total);

    expect(body.size).toBe(100);
    expect(body.items.length).toBe(100);
    expect(body.items.length).toBeLessThanOrEqual(body.size);
});


test('API handles a page beyond the available results', async ({ api }) => {
    const response = await api.get(
        '/api/v1/products?page=3&size=100'
    );


    expect(response.status()).toBe(200);
    // console.log('Status:', response.status());
    // console.log('Body:', await response.json());
    const body = await response.json();

    expect(body.page).toBe(3);
    expect(body.size).toBe(100);
    expect(body.totalPages).toBe(2);
    expect(body.hasNext).toBe(false);
    expect(body.items).toHaveLength(0);
});

test('API returns the remaining products on the final page', async ({
    api,
}) => {
    const response = await api.get(
        '/api/v1/products?page=2&size=100'
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.page).toBe(2);
    expect(body.total).toBe(111);
    expect(body.totalPages).toBe(2);
    expect(body.items).toHaveLength(11);
    expect(body.hasNext).toBe(false);
});

// test('inspect product detail response', async ({ api }) => {
//     const response = await api.get('/api/v1/products/61456');

//     console.log('Status:', response.status());
//     console.log('Body:', await response.json());
// });
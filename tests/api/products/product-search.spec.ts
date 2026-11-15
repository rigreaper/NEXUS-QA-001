import { test, expect } from '../../../src/fixtures/api.fixture.js';

test('user can search products by keyword', async ({ api }) => {
    const searchTerm = 'Dress';

    const response = await api.get(
        `/api/v1/search?q=${searchTerm}`
    );

    expect(response.status()).toBe(200);

    //console.log('Status:', response.status());

    const body = await response.json();

    //console.log('Body:', body);

    expect(body.q).toBe(searchTerm);
    expect(body.page).toBe(1);
    expect(body.size).toBe(20);
    expect(body.total).toBeGreaterThan(0);
    expect(body.totalPages).toBeGreaterThan(0);
    expect(body.hasNext).toBe(false);

    expect(body.items.length).toBe(body.total);

    for (const product of body.items) {
        expect(product.name).toMatch(/dress/i);
        expect(product.id).toBeTruthy();
        expect(product.sku).toBeTruthy();
        expect(typeof product.price).toBe('number');
        expect(product.currency).toBe('TRY');
    }
});

test('API rejects search terms shorter than two characters', async ({
    api,
}) => {
    const response = await api.get('/api/v1/search?q=D');

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('API rejects a search request without a query', async ({ api }) => {
    const response = await api.get('/api/v1/search');

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('search results support pagination without duplicate products', async ({
    api,
}) => {
    const firstResponse = await api.get(
        '/api/v1/search?q=Dress&page=1&size=5'
    );

    const secondResponse = await api.get(
        '/api/v1/search?q=Dress&page=2&size=5'
    );

    expect(firstResponse.status()).toBe(200);
    expect(secondResponse.status()).toBe(200);

    const firstPage = await firstResponse.json();
    const secondPage = await secondResponse.json();

    expect(firstPage.page).toBe(1);
    expect(secondPage.page).toBe(2);

    expect(firstPage.size).toBe(5);
    expect(secondPage.size).toBe(5);

    expect(firstPage.items).toHaveLength(5);
    expect(secondPage.items.length).toBeGreaterThan(0);

    expect(firstPage.total).toBe(secondPage.total);

    const firstPageIds = firstPage.items.map(
        (product: { id: number }) => product.id
    );

    const secondPageIds = secondPage.items.map(
        (product: { id: number }) => product.id
    );

    const overlappingIds = firstPageIds.filter(
        (id: number) => secondPageIds.includes(id)
    );

    expect(overlappingIds).toHaveLength(0);
});

test('API returns an empty result when no products match', async ({
    api,
}) => {
    const response = await api.get(
        '/api/v1/search?q=XYZNonexistentProduct'
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.q).toBe('XYZNonexistentProduct');
    expect(body.total).toBe(0);
    expect(body.totalPages).toBe(0);
    expect(body.hasNext).toBe(false);
    expect(body.items).toHaveLength(0);
});
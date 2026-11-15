import { test, expect } from '../../../src/fixtures/api.fixture.js';

// test('inspect category tree response', async ({ api }) => {
//     const response = await api.get('/api/v1/categories');

//     console.log('Status:', response.status());

//     const body = await response.json();

//     console.log('Body:', JSON.stringify(body, null, 2));
// });

test('user can retrieve the category tree', async ({ api }) => {
    const response = await api.get('/api/v1/categories');

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.total).toBeGreaterThan(0);
    expect(body.categories).toBeInstanceOf(Array);
    expect(body.categories.length).toBeGreaterThan(0);

    for (const category of body.categories) {
        expect(category.id).toBeTruthy();
        expect(category.name).toBeTruthy();
        expect(category.slug).toBeTruthy();
        expect(category.parent_id).toBeNull();

        expect(category.children).toBeInstanceOf(Array);

        for (const child of category.children) {
            expect(child.id).toBeTruthy();
            expect(child.name).toBeTruthy();
            expect(child.slug).toBeTruthy();
            expect(child.parent_id).toBe(category.id);
            expect(child.children).toBeInstanceOf(Array);
        }
    }

    const totalCategories = body.categories.reduce(
        (total: number, category: { children: unknown[] }) =>
            total + 1 + category.children.length,
        0
    );

    expect(totalCategories).toBe(body.total);
});

test('parent category includes products from all child categories', async ({
    api,
}) => {
    const categoryResponse = await api.get('/api/v1/categories');
    const categoryBody = await categoryResponse.json();

    const parentCategory = categoryBody.categories[0];

    const parentResponse = await api.get(
        `/api/v1/categories/${parentCategory.id}/products?size=100`
    );

    expect(parentResponse.status()).toBe(200);

    const parentBody = await parentResponse.json();

    const childProductIds: number[] = [];

    for (const child of parentCategory.children) {
        const childResponse = await api.get(
            `/api/v1/categories/${child.id}/products?size=100`
        );

        expect(childResponse.status()).toBe(200);

        const childBody = await childResponse.json();

        expect(childBody.category.id).toBe(child.id);

        childProductIds.push(
            ...childBody.items.map(
                (product: { id: number }) => product.id
            )
        );
    }

    const parentProductIds = parentBody.items.map(
        (product: { id: number }) => product.id
    );

    expect(parentProductIds.sort((a: number, b: number) => a - b))
        .toEqual(childProductIds.sort((a, b) => a - b));
});

test('API returns 404 for a nonexistent category', async ({ api }) => {
    const response = await api.get(
        '/api/v1/categories/999999999/products'
    );

    expect(response.status()).toBe(404);

    const body = await response.json();

    expect(body.error).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('category products support pagination without duplicates', async ({
    api,
}) => {
    const categoryResponse = await api.get('/api/v1/categories');
    const categoryBody = await categoryResponse.json();

    const parentCategory = categoryBody.categories[0];

    const firstResponse = await api.get(
        `/api/v1/categories/${parentCategory.id}/products?page=1&size=5`
    );

    const secondResponse = await api.get(
        `/api/v1/categories/${parentCategory.id}/products?page=2&size=5`
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
    expect(secondPage.items).toHaveLength(5);

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
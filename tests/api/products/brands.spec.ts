import { test, expect } from '../../../src/fixtures/api.fixture.js';

// test('inspect brands response', async ({ api }) => {
//     const response = await api.get('/api/v1/brands');

//     console.log('Status:', response.status());

//     const body = await response.json();

//     console.log('Body:', JSON.stringify(body, null, 2));
// });

test('user can retrieve the brand list', async ({ api }) => {
    const response = await api.get('/api/v1/brands');

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.total).toBeGreaterThan(0);
    expect(body.brands).toBeInstanceOf(Array);
    expect(body.brands.length).toBe(body.total);

    for (const brand of body.brands) {
        expect(brand.id).toBeTruthy();
        expect(brand.name).toBeTruthy();
        expect(brand.product_count).toBeGreaterThan(0);
    }

    const brandIds = body.brands.map(
        (brand: { id: number }) => brand.id
    );

    const uniqueBrandIds = new Set(brandIds);

    expect(uniqueBrandIds.size).toBe(brandIds.length);
});

test('brand product counts match the product list', async ({ api }) => {
    const brandsResponse = await api.get('/api/v1/brands');
    expect(brandsResponse.status()).toBe(200);

    const brandsBody = await brandsResponse.json();

    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=100'
    );
    expect(productsResponse.status()).toBe(200);

    const firstPage = await productsResponse.json();

    const products: { brand: string | null }[] = [
        ...firstPage.items,
    ];

    if (firstPage.hasNext) {
        const secondResponse = await api.get(
            '/api/v1/products?page=2&size=100'
        );

        expect(secondResponse.status()).toBe(200);

        const secondPage = await secondResponse.json();
        products.push(...secondPage.items);
    }

    for (const brand of brandsBody.brands) {
        const matchingProducts = products.filter(
            product => product.brand === brand.name
        );

        expect(matchingProducts.length).toBe(brand.product_count);
    }
});
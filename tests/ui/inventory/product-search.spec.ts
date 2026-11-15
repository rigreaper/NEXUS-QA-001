
import { test, expect } from '../../../src/fixtures/test.fixture.js';
import { testConfig } from '../../../src/config/test-config.js';

test.beforeEach(async ({ page, storeLoginPage, inventoryPage }) => {
    await page.goto('/en/qa-shop/');

    await storeLoginPage.openLoginDialog();

    await expect(storeLoginPage.emailInput).toBeVisible();

    await storeLoginPage.signIn(
        testConfig.storeCredentials.email,
        testConfig.storeCredentials.password
    );

});


test('user can search for a product by its exact name', async ({
    inventoryPage,
}) => {
    await inventoryPage.searchForProduct('Sport Red Shirt');

    await expect(inventoryPage.productCount).toHaveText('1');

    await expect(
        inventoryPage.getProductCard('Sport Red Shirt')
    ).toBeVisible();

    await expect(
        inventoryPage.productList.locator('li')
    ).toHaveCount(1);
});

test('user can search for a product using a partial name', async ({
    inventoryPage,
}) => {
    await inventoryPage.searchForProduct('Sport Red');

    const matchingProducts = inventoryPage.productList
        .locator('li')
        .filter({ hasText: 'Sport Red' });

    await expect(matchingProducts.first()).toBeVisible();
    await expect(inventoryPage.productList.locator('li')).not.toHaveCount(0);
});



test('user can search for products by keyword', async ({
    inventoryPage,
}) => {
    await inventoryPage.searchForProduct('Shirt');

    const products = inventoryPage.productList.locator('li');

    await expect(products.first()).toBeVisible();

    const productNames = await products
        .locator('[data-testid^="urun-ad-"]')
        .allTextContents();

    expect(productNames.length).toBeGreaterThan(0);

    for (const productName of productNames) {
        expect(productName).toMatch(/shirt/i);
    }

    const totalMatchingProducts = Number(
        await inventoryPage.productCount.textContent()
    );

    expect(totalMatchingProducts).toBeGreaterThanOrEqual(
        productNames.length
    );
});

//--BUG-001--//

// test('user can search for products by brand', async ({  
//     inventoryPage,
// }) => {
//     await inventoryPage.searchForProduct('Adidas');

//     const products = inventoryPage.productList.locator('li');

//     await expect(products.first()).toBeVisible();

//     const brands = await products
//         .locator('[data-testid^="urun-marka-"]')
//         .allTextContents();

//     expect(brands.length).toBeGreaterThan(0);

//     for (const brand of brands) {
//         expect(brand.trim().toLowerCase()).toBe('adidas');
//     }

//     const totalMatchingProducts = Number(
//         await inventoryPage.productCount.textContent()
//     );

//     expect(totalMatchingProducts).toBeGreaterThanOrEqual(
//         brands.length
//     );
// });





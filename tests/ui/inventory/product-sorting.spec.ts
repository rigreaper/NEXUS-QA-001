
import { test, expect } from '../../../src/fixtures/test.fixture.js';
import { testConfig } from '../../../src/config/test-config.js';

test.beforeEach(async ({ page, storeLoginPage, inventoryPage }) => {
    await page.goto('/en/qa-shop/');

    await storeLoginPage.openLoginDialog();

    await expect(storeLoginPage.emailInput).toBeVisible();

    await storeLoginPage.signInSuccessfully(
        testConfig.storeCredentials.email,
        testConfig.storeCredentials.password
    );
});

test('user can sort products by price in ascending order', async ({ inventoryPage }) => {
    await inventoryPage.searchInput.fill('Shirt');

    
    await inventoryPage.sortByPriceAscending();

    await expect(inventoryPage.sortSelect).toHaveValue('price:asc');

    const priceElements = inventoryPage.productList.locator(
        '[data-testid^="urun-fiyat-"]'
    );

    const priceTexts = await priceElements.allTextContents();

    const prices = priceTexts.map(price =>
        Number(price.replace('TRY', '').trim())
    );

    const sortedPrices = [...prices].sort((a, b) => a - b);

    expect(prices.length).toBeGreaterThan(0);
    expect(prices).toEqual(sortedPrices);
});

test('user can sort products by price in descending order', async ({ inventoryPage }) => {
    await inventoryPage.searchInput.fill('Shirt');

    await expect(
        inventoryPage.getProductCard('Sport Red Shirt')
    ).toBeVisible();

    await inventoryPage.sortByPriceDescending();

    await expect(inventoryPage.sortSelect).toHaveValue('price:desc');

    await expect.poll(async () => {
        const priceElements = inventoryPage.productList.locator(
            '[data-testid^="urun-fiyat-"]'
        );

        const priceTexts = await priceElements.allTextContents();

        const prices = priceTexts.map(price =>
            Number(price.replace('TRY', '').trim())
        );

        return prices.length > 0 &&
            prices.every((price, index) => {
                if (index === 0) {
                    return true;
                }

                const previousPrice = prices[index - 1];

                return previousPrice !== undefined && previousPrice >= price;
            });

    }).toBe(true);
});




test('user can sort products by newest', async ({ inventoryPage }) => {
    
    await inventoryPage.searchInput.fill('Shirt');

    await expect(
        inventoryPage.productList.locator('li').first()
    ).toBeVisible();

    await inventoryPage.sortByNewest();

    await expect(inventoryPage.sortSelect).toHaveValue('created:desc');

    await expect(
        inventoryPage.productList.locator('li')
    ).not.toHaveCount(0);
});


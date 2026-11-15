
import { test, expect } from '../../../src/fixtures/test.fixture.js';
import { testConfig } from '../../../src/config/test-config.js';

test.beforeEach(async ({ page, storeLoginPage }) => {
    await page.goto('/en/qa-shop/');

    await storeLoginPage.openLoginDialog();

    await storeLoginPage.signIn(
        testConfig.storeCredentials.email,
        testConfig.storeCredentials.password
    );

    await expect(storeLoginPage.signOutButton).toBeVisible();
});

test('user can add a product and update its quantity', async ({
    inventoryPage,
    cartPage,
}) => {

    await inventoryPage.searchInput.fill('Sport Red Shirt');

    await expect(
        inventoryPage.getProductCard('Sport Red Shirt')
    ).toBeVisible();

    await inventoryPage.addToCart('Sport Red Shirt');

    await expect(inventoryPage.cartCount).toHaveText('1');

    await cartPage.openCart();

    await expect(
        cartPage.getCartItem('Sport Red Shirt')
    ).toBeVisible();

    await expect(
        cartPage.getCartItemQuantity('Sport Red Shirt')
    ).toHaveText('1');
    const initialTotal = await cartPage.grandTotal.textContent();
    await cartPage.increaseQuantity('Sport Red Shirt');

    await expect(
        cartPage.getCartItemQuantity('Sport Red Shirt')
    ).toHaveText('2');
    await expect(cartPage.grandTotal).not.toHaveText(initialTotal ?? '');

    await cartPage.decreaseQuantity('Sport Red Shirt');

    await expect(
        cartPage.getCartItemQuantity('Sport Red Shirt')
    ).toHaveText('1');
    await expect(cartPage.grandTotal).toHaveText(initialTotal ?? '');

    await cartPage.removeItem('Sport Red Shirt');

    await expect(
        cartPage.getCartItem('Sport Red Shirt')
    ).toHaveCount(0);

    await expect(inventoryPage.cartCount).toHaveText('0');
});


import { test, expect } from '../../../src/fixtures/test.fixture.js';
import { testConfig } from '../../../src/config/test-config.js';

test.beforeEach(async ({ page, storeLoginPage }) => {
    // page.on('response', async response => {
    //     if (
    //         response.url().includes('/api/v1/products') &&
    //         response.url().includes('page=1')
    //     ) {
    //         console.log('PRODUCT API:', {
    //             url: response.url(),
    //             status: response.status(),
    //             body: (await response.text()).slice(0, 500),
    //         });
    //     }
    // });

    await page.goto('/en/qa-shop/');

    //await expect(page.getByTestId('urun-listesi')).toBeVisible();

    await storeLoginPage.openLoginDialog();

    await expect(storeLoginPage.emailInput).toBeVisible();
    await expect(storeLoginPage.passwordInput).toBeVisible();

    await storeLoginPage.signIn(
        testConfig.storeCredentials.email,
        testConfig.storeCredentials.password
    );

    await expect(storeLoginPage.signOutButton).toBeVisible();
});


test('user can complete a purchase successfully', async ({
    page,
    inventoryPage,
    cartPage,
    checkoutPage,
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

    await cartPage.checkoutButton.click();

    await expect(checkoutPage.paymentMethodCard).toBeVisible();
    await expect(checkoutPage.cardNumberInput).toBeVisible();
    await expect(checkoutPage.cardNameInput).toBeVisible();
    await expect(checkoutPage.cardExpiryInput).toBeVisible();

    await checkoutPage.selectCardPaymentMethod();

    await checkoutPage.fillCardDetails(
        '4242 4242 4242 4242',
        'QA Tester',
        '12/29'
    );

    await checkoutPage.placeOrder();

    await expect(
        page.getByText('Your order is placed')
    ).toBeVisible();

    await expect(
        page.getByText(/^ORD-\d+$/)
    ).toBeVisible();

    await expect(
        page.getByText('paid', { exact: true })
    ).toBeVisible();
});

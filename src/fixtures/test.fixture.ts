import { test as base, expect } from '@playwright/test';
import { StoreLoginPage } from '../pages/store-login.page.js';
import { InventoryPage } from '../pages/inventory.page.js';
import { CartPage } from '../pages/cart.page.js';
import { CheckoutPage } from '../pages/checkout.page.js';

type AppFixtures = {
    storeLoginPage: StoreLoginPage;
    inventoryPage: InventoryPage;
    cartPage: CartPage;
    checkoutPage: CheckoutPage;
};

export const test = base.extend<AppFixtures>({
    storeLoginPage: async ({ page }, use) => {
        await use(new StoreLoginPage(page));
    },
    inventoryPage: async ({ page }, use) => {
        await use(new InventoryPage(page));
    },
    cartPage: async ({ page }, use) => {
        await use(new CartPage(page));
    },
    checkoutPage: async ({ page }, use) => {
        await use(new CheckoutPage(page));
    }
});

export { expect };

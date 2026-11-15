
import { type Page, type Locator } from '@playwright/test';

export class CartPage {
    readonly page: Page;
    readonly cartItems: Locator;
    readonly grandTotal: Locator;
    readonly checkoutButton: Locator;
    readonly cartButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.cartItems = page.locator('[data-testid^="sepet-satir-"]');
        this.grandTotal = page.getByTestId('toplam-genel');
        this.checkoutButton = page.getByTestId('odemeye-gec');
        this.cartButton = page.getByTestId('sepet-butonu');
    }

    getCartItem(productName: string): Locator {
        return this.cartItems.filter({ hasText: productName });
    }

    getCartItemQuantity(productName: string): Locator {
        return this.getCartItem(productName).getByTestId(/^adet-\d+$/);
    }

    getIncreaseQuantityButton(productName: string): Locator {
        return this.getCartItem(productName).getByTestId(/^adet-artir-\d+$/);
    }

    getDecreaseQuantityButton(productName: string): Locator {
        return this.getCartItem(productName).getByTestId(/^adet-azalt-\d+$/);
    }

    async openCart(): Promise<void> {
        await this.cartButton.click();
    }

    async increaseQuantity(productName: string): Promise<void> {
        await this.getIncreaseQuantityButton(productName).click();
    }

    async decreaseQuantity(productName: string): Promise<void> {
        await this.getDecreaseQuantityButton(productName).click();
    }

    getRemoveItemButton(productName: string): Locator {
        return this.getCartItem(productName).getByTestId(/^sepet-sil-\d+$/);
    }

    async removeItem(productName: string): Promise<void> {
        await this.getRemoveItemButton(productName).click();
    }
}

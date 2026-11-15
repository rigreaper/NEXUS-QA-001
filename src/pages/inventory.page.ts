import { type Page, type Locator, expect } from '@playwright/test';

export class InventoryPage {
    readonly page: Page;
    readonly productList: Locator;
    readonly searchInput: Locator;
    readonly cartButton: Locator;
    readonly cartCount: Locator;
    readonly sortSelect: Locator;
    readonly searchButton: Locator;
    readonly productCount: Locator;

    constructor(page: Page) {
        this.page = page;

        this.productList = page.getByTestId('urun-listesi');
        this.searchInput = page.getByTestId('urun-ara');
        this.cartButton = page.getByTestId('sepet-butonu');
        this.cartCount = page.getByTestId('sepet-sayaci');
        this.sortSelect = page.getByTestId('urun-sirala');
        this.searchButton = page.getByTestId('arama-btn');
        this.productCount = page.getByTestId('urun-sayisi');
    }

    getProductCard(productName: string): Locator {
        return this.productList
            .locator('li')
            .filter({ hasText: productName });
    }
    
    async addToCart(productName: string): Promise<void> {
        const productCard = this.getProductCard(productName);

        await productCard
            .getByRole('button', { name: 'Add to Cart' })
            .click();
    }

    async sortByPriceAscending(): Promise<void> {
        await this.sortSelect.selectOption('price:asc');
    }

    async sortByPriceDescending(): Promise<void> {
        await this.sortSelect.selectOption('price:desc');
    }

    async sortByNewest(): Promise<void> {
        await this.sortSelect.selectOption('created:desc');
    }

    async searchForProduct(productName: string): Promise<void> {
        await this.searchInput.fill(productName);
        await this.searchButton.click();

        await expect(
            this.productList.locator('li').filter({ hasText: productName }).first()
        ).toBeVisible();
    }
}


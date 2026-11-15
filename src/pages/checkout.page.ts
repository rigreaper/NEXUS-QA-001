import { type Page, type Locator } from '@playwright/test';

export class CheckoutPage {
    readonly page: Page;
    readonly paymentMethodCard: Locator;
    readonly addressList: Locator;
    readonly cardNumberInput: Locator;
    readonly cardNameInput: Locator;
    readonly cardExpiryInput: Locator;
    readonly placeOrderButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.paymentMethodCard = page.getByTestId('odeme-yontemi-card');
        this.addressList = page.getByTestId('adres-listesi');
        this.cardNumberInput = page.getByTestId('kart-no');
        this.cardNameInput = page.getByTestId('kart-ad');
        this.cardExpiryInput = page.getByTestId('kart-tarih');
        this.placeOrderButton = page.getByTestId('siparis-tamamla');
    }
    
    async selectCardPaymentMethod(): Promise<void> {
        await this.paymentMethodCard.click();
    }

    async fillCardDetails(
        cardNumber: string,
        cardName: string,
        expiryDate: string
    ): Promise<void> {
        await this.cardNumberInput.fill(cardNumber);
        await this.cardNameInput.fill(cardName);
        await this.cardExpiryInput.fill(expiryDate);
    }

    async placeOrder(): Promise<void> {
        await this.placeOrderButton.click();
    }
}
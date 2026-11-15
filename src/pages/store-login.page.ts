import { type Page, type Locator, expect } from '@playwright/test';

export class StoreLoginPage {

    readonly page: Page;

    readonly openLoginButton: Locator;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;

    readonly signOutButton: Locator;
    readonly loginOverlay: Locator;
    readonly closeLoginButton: Locator;

    readonly notification: Locator;
    readonly notificationMessage: Locator;
    readonly closeNotificationButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.openLoginButton = page.getByTestId('giris-ac');
        this.emailInput = page.getByTestId('giris-eposta');
        this.passwordInput = page.getByTestId('giris-parola');
        this.submitButton = page.getByTestId('giris-yap');
        this.signOutButton = page.getByTestId('cikis-yap');
        this.loginOverlay = page.getByTestId('giris-katman');
        this.closeLoginButton = page.getByTestId('giris-kapat');
        this.notification = page.getByTestId('bildirim');
        this.notificationMessage = page.getByTestId('bildirim-metin');
        this.closeNotificationButton = page.getByTestId('bildirim-kapat');
    }

    async openLoginDialog(): Promise<void> {
        await this.page.getByRole('button', {
            name: /(?:Browser|Docker) mode · how does it work\?/,
        }).waitFor({ state: 'visible' });
        await this.openLoginButton.click();
        // await this.emailInput.waitFor({ state: 'visible' });
    }

    async closeLoginDialog(): Promise<void> {
        await this.closeLoginButton.click();
    }

    async closeNotification(): Promise<void> {
        await this.closeNotificationButton.click();
    }

    async signIn(email: string, password: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }

    async signInSuccessfully(email: string, password: string): Promise<void> {
        await this.signIn(email, password);
        await expect(this.signOutButton).toBeVisible();
        await expect(this.loginOverlay).toBeHidden();
    }
}

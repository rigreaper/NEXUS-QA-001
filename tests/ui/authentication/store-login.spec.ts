
import { test, expect } from '../../../src/fixtures/test.fixture.js';
import type { Page } from '@playwright/test';
import { testConfig } from '../../../src/config/test-config.js';
import { authenticationTestData } from '../../../src/data/authentication-test-data.js';
import type { StoreLoginPage } from '../../../src/pages/store-login.page.js';

test.use({ serviceWorkers: 'block' });

async function submitLoginAndAssertLocalApi(
    page: Page,
    storeLoginPage: StoreLoginPage,
    email: string,
    password: string,
    successful: boolean
): Promise<void> {
    const loginResponsePromise = page.waitForResponse(response => {
        const responseUrl = new URL(response.url());

        return responseUrl.pathname === '/api/v1/auth/login' &&
            response.request().method() === 'POST';
    });

    if (successful) {
        await storeLoginPage.signInSuccessfully(email, password);
    } else {
        await storeLoginPage.signIn(email, password);
    }

    const loginResponse = await loginResponsePromise;
    const expectedOrigin = new URL(testConfig.apiBaseURL).origin;

    expect(
        new URL(loginResponse.url()).origin,
        `Login response (HTTP ${loginResponse.status()}) came from ${loginResponse.url()}`
    ).toBe(expectedOrigin);
}

test.describe('Store Authentication', () => {

    test.beforeEach(async ({ page, storeLoginPage }) => {
        await page.context().grantPermissions(
            ['local-network-access'],
            { origin: new URL(testConfig.baseURL).origin }
        );
        await page.goto(testConfig.qaShopPath);
        await storeLoginPage.openLoginDialog();
        
        console.log(
            'Submit button:',
            await storeLoginPage.submitButton.ariaSnapshot()
        );

        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();
    });

    test('should successfully sign in with valid credentials', async ({ page, storeLoginPage }) => {
        await submitLoginAndAssertLocalApi(
            page,
            storeLoginPage,
            testConfig.storeCredentials.email,
            testConfig.storeCredentials.password,
            true
        );

        await expect(storeLoginPage.signOutButton).toBeVisible();
    });

    test('should reject login with an invalid password', async ({ page, storeLoginPage }) => {
        await submitLoginAndAssertLocalApi(
            page,
            storeLoginPage,
            testConfig.storeCredentials.email,
            authenticationTestData.invalidPassword.password,
            false
        );


       
        await expect(storeLoginPage.signOutButton).toBeHidden();
        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();

    });

    test('should reject login with an invalid email', async ({ page, storeLoginPage }) => {
        await submitLoginAndAssertLocalApi(
            page,
            storeLoginPage,
            authenticationTestData.invalidEmail.email,
            testConfig.storeCredentials.password,
            false
        );

        
        await expect(storeLoginPage.signOutButton).toBeHidden();
        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();
    });

    test('should reject login with invalid email and password', async ({ page, storeLoginPage }) => {
        await submitLoginAndAssertLocalApi(
            page,
            storeLoginPage,
            authenticationTestData.invalidCredentials.email,
            authenticationTestData.invalidCredentials.password,
            false
        );

        
        await expect(storeLoginPage.signOutButton).toBeHidden();
        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();
    });

    test('should reject login with empty credentials', async ({ page, storeLoginPage }) => {
        await submitLoginAndAssertLocalApi(
            page,
            storeLoginPage,
            authenticationTestData.emptyCredentials.email,
            authenticationTestData.emptyCredentials.password,
            false
        );

      
        await expect(storeLoginPage.signOutButton).toBeHidden();
        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();
    });

});

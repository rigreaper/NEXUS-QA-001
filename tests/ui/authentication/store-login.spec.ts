
import { test, expect } from '../../../src/fixtures/test.fixture.js';
import { testConfig } from '../../../src/config/test-config.js';
import { authenticationTestData } from '../../../src/data/authentication-test-data.js';

test.describe('Store Authentication', () => {

    test.beforeEach(async ({ page, storeLoginPage }) => {
        await page.context().grantPermissions(
            ['local-network-access'],
            { origin: 'https://learnqa.dev' }
        );
        await page.goto(testConfig.qaShopPath);
        await storeLoginPage.openLoginDialog();

        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();
    });

    test('should successfully sign in with valid credentials', async ({ storeLoginPage }) => {
        await storeLoginPage.signIn(
            testConfig.storeCredentials.email,
            testConfig.storeCredentials.password
        );

        await expect(storeLoginPage.signOutButton).toBeVisible();
    });

    test('should reject login with an invalid password', async ({ storeLoginPage }) => {
        await storeLoginPage.signIn(
            testConfig.storeCredentials.email,
            authenticationTestData.invalidPassword.password
        );


       
        await expect(storeLoginPage.signOutButton).toBeHidden();
        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();

    });

    test('should reject login with an invalid email', async ({ storeLoginPage }) => {
        await storeLoginPage.signIn(
            authenticationTestData.invalidEmail.email,
            testConfig.storeCredentials.password
        );

        
        await expect(storeLoginPage.signOutButton).toBeHidden();
        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();
    });

    test('should reject login with invalid email and password', async ({ storeLoginPage }) => {
        await storeLoginPage.signIn(
            authenticationTestData.invalidCredentials.email,
            authenticationTestData.invalidCredentials.password
        );

        
        await expect(storeLoginPage.signOutButton).toBeHidden();
        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();
    });

    test('should reject login with empty credentials', async ({ storeLoginPage }) => {
        await storeLoginPage.signIn(
            authenticationTestData.emptyCredentials.email,
            authenticationTestData.emptyCredentials.password
        );

      
        await expect(storeLoginPage.signOutButton).toBeHidden();
        await expect(storeLoginPage.emailInput).toBeVisible();
        await expect(storeLoginPage.passwordInput).toBeVisible();
    });

});

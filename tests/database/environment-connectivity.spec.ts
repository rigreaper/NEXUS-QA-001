
import { test, expect } from '@playwright/test';
import { testConfig } from '../../src/config/test-config.js';
import { query, closeDatabase } from '../../src/database/clients/postgres-client.js';

test('local API and PostgreSQL are available', async ({ page, request }) => {
    const productResponsePromise = page.waitForResponse(response => {
        const responseUrl = new URL(response.url());

        return responseUrl.pathname === '/api/v1/products' &&
            response.request().method() === 'GET';
    });

    await page.goto(testConfig.qaShopPath);

    const productResponse = await productResponsePromise;
    expect(productResponse.status()).toBe(200);
    //await expect(page.getByTestId('urun-listesi')).toBeVisible();

    const healthResponse = await request.get(
        `${testConfig.apiBaseURL}/health`
    );

    expect(healthResponse.status()).toBe(200);

    const databaseResult = await query<{
        database_name: string;
    }>(
        'SELECT current_database() AS database_name'
    );

    expect(databaseResult[0]?.database_name).toBe('qashop');
});


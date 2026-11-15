
import { test } from '@playwright/test';

test('inspect QA-Shop browser connection', async ({ page }) => {
    page.on('request', async request => {
        const url = new URL(request.url());

        if (!url.pathname.includes('/api/')) return;

        const headers = await request.allHeaders();

        console.log('[API REQUEST]', request.method(), url.origin, url.pathname);
        console.log('[SANDBOX KEY PRESENT]', Boolean(headers['x-sandbox-key']));
    });

    page.on('response', response => {
        const url = new URL(response.url());

        if (!url.pathname.includes('/api/')) return;

        console.log('[API RESPONSE]', response.status(), url.origin, url.pathname);
    });

    page.on('requestfailed', request => {
        const url = new URL(request.url());

        if (!url.pathname.includes('/api/')) return;

        console.log('[API REQUEST FAILED]', url.origin, url.pathname, request.failure()?.errorText);
    });

    page.on('pageerror', error => {
        console.log('[JAVASCRIPT ERROR]', error.message);
    });

    page.on('console', message => {
        console.log('[BROWSER CONSOLE]', message.type(), message.text());
    });
    await page.context().grantPermissions(
        ['local-network-access'],
        { origin: 'https://learnqa.dev' }
    );
    await page.goto('https://learnqa.dev/en/qa-shop/');
    await page.pause();
});

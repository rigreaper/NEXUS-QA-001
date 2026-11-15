
import { test } from '@playwright/test';//AI code here

test('inspect QA-Shop browser connection', async ({ page }) => {
    page.on('request', async request => {
        const url = new URL(request.url());

        if (url.origin !== 'http://localhost:4000') return;

        const headers = await request.allHeaders();

        console.log(
            '[API REQUEST]',
            request.method(),
            url.pathname
        );

        console.log(
            '[SANDBOX KEY PRESENT]',
            Boolean(headers['x-sandbox-key'])
        );
    });

    page.on('response', response => {
        const url = new URL(response.url());

        if (url.origin !== 'http://localhost:4000') return;

        console.log(
            '[API RESPONSE]',
            response.status(),
            response.request().method(),
            url.pathname
        );
    });

    page.on('requestfailed', request => {
        const url = new URL(request.url());

        if (url.origin !== 'http://localhost:4000') return;

        console.log(
            '[API REQUEST FAILED]',
            url.pathname,
            request.failure()?.errorText
        );
    });

    page.on('pageerror', error => {
        console.log('[JAVASCRIPT ERROR]', error.message);
    });

    await page.goto('https://learnqa.dev/en/qa-shop/');
    page.on('console', message => {
        console.log(
            '[BROWSER CONSOLE]',
            message.type(),
            message.text()
        );
    });
    await page.pause();
});

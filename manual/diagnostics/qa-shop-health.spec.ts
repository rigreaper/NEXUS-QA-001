import { test, expect } from '@playwright/test'; //AI code here

test('diagnose QA-Shop API and product endpoint', async ({ request }) => {

    const healthResponse = await request.get('http://localhost:4000/health');

    console.log('Health status:', healthResponse.status());
    console.log('Health response:', await healthResponse.text());

    const productsResponse = await request.get(
        'http://localhost:4000/api/v1/products'
    );

    console.log('Products status:', productsResponse.status());
    console.log('Products response:', await productsResponse.text());

    expect(healthResponse.ok()).toBeTruthy();

});

test('diagnose QA-Shop frontend connection', async ({ page }) => {

    page.on('request', request => {
        if (['fetch', 'xhr'].includes(request.resourceType())) {
            const url = new URL(request.url());

            console.log(
                'REQUEST:',
                request.method(),
                url.origin + url.pathname
            );
        }
    });

    page.on('response', response => {
        const request = response.request();

        if (['fetch', 'xhr'].includes(request.resourceType())) {
            const url = new URL(response.url());

            console.log(
                'RESPONSE:',
                response.status(),
                url.origin + url.pathname
            );
        }
    });

    page.on('requestfailed', request => {
        const url = new URL(request.url());

        console.log(
            'REQUEST FAILED:',
            url.origin + url.pathname,
            request.failure()?.errorText
        );
    });

    page.on('pageerror', error => {
        console.log('JAVASCRIPT ERROR:', error.message);
    });

    await page.goto('https://learnqa.dev/en/qa-shop/');

    console.log(
        'FULL PAGE CONTENT:',
        await page.locator('body').innerText()
    );

    const buttons = await page.locator('button').evaluateAll(elements =>
        elements.map(button => ({
            text: button.textContent?.trim(),
            testId: button.getAttribute('data-testid'),
            disabled: (button as HTMLButtonElement).disabled,
        }))
    );

    console.log('BUTTONS:', buttons);

    const links = await page.locator('a').evaluateAll(elements =>
        elements.map(link => ({
            text: link.textContent?.trim(),
            href: link.getAttribute('href'),
        }))
    );

    console.log('LINKS:', links);

    console.log('PAGE TITLE:', await page.title());
    console.log('PAGE CONTENT:', (await page.locator('body').innerText()).slice(0, 1500));

});



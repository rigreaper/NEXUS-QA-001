// cross layer testing  UI - API - Database
// im stress fuvk , the website conflict sandbox and so on

import { test, expect } from '../../src/fixtures/integration.fixture.js';
import { type APIRequestContext } from '@playwright/test';
import { testConfig } from '../../src/config/test-config.js';
import {
    getOrderById,
    getOrderItemsByOrderId,
    getOrderFinancialSummary,
} from '../../src/database/queries/orders.js';
import { closeDatabase } from '../../src/database/clients/postgres-client.js';

type LoginResponse = {
    token: string;
    user: {
        id: number | string;
    };
};

type OrderResponse = {
    order: {
        id: number;
        order_no: string;
        status: string;
        subtotal: number;
        discount_total: number;
        shipping_total: number;
        grand_total: number;
    };
    items: Array<{
        variant_id: number;
        qty: number;
        unit_price: number;
        line_total: number;
        name_snapshot: string;
        variant_sku: string;
    }>;
    payments: unknown[];
    shipments: unknown[];
};



test('QA-Shop purchase flow: UI → API → Database', async ({
    page,
    sandbox,
    api,
    storeLoginPage,
    inventoryPage,
    cartPage,
    checkoutPage,
}) => {
    await page.context().grantPermissions(
        ['local-network-access'],
        { origin: 'https://learnqa.dev' }
    );

    await page.route('**/api/v1/**', async route => {
        await route.continue({
            headers: {
                ...route.request().headers(),
                'x-sandbox-key': sandbox.apiKey,
            },
        });
    });

    // console.log('Sandbox ID:', sandbox.sandboxId);
    // console.log('API key available:', Boolean(sandbox.apiKey));
    // console.log('Demo user:', sandbox.demoUser.email);

    const sandboxInfoResponsePromise = page.waitForResponse(response =>
        response.url().endsWith('/api/v1/sandbox/bugs') &&
        response.request().method() === 'GET'
    );

    await page.goto(testConfig.qaShopPath);

    await expect(inventoryPage.productList).toBeVisible();

    const sandboxInfoResponse = await sandboxInfoResponsePromise;

    expect(sandboxInfoResponse.status()).toBe(200);

    const sandboxInfo = await sandboxInfoResponse.json();


    // console.log('Browser sandbox ID:', sandboxInfo.sandboxId);
    // console.log('Fixture sandbox ID:', sandbox.sandboxId);

    expect(sandboxInfo.sandboxId).toBe(sandbox.sandboxId);

    await storeLoginPage.openLoginDialog();

    await storeLoginPage.signIn(
        sandbox.demoUser.email,
        sandbox.demoUser.password
    );

    await expect(inventoryPage.productList).toBeVisible();

    // console.log('UI login successful.');

    const productName = 'Slim Fit Red Shirt';

    await inventoryPage.searchInput.fill(productName);

    const productCard = inventoryPage.productList
        .locator('li')
        .filter({
            has: page.getByText(productName, { exact: true }),
        });

    
    await expect(productCard.first()).toBeVisible();

    await productCard.first()
        .getByRole('button', { name: 'Add to Cart' })
        .click();

    // console.log('Product added to cart.');

    await inventoryPage.cartButton.click();

    await expect(cartPage.getCartItem(productName)).toBeVisible();

    // console.log('Cart verification successful.');

    await cartPage.checkoutButton.click();

    await checkoutPage.selectCardPaymentMethod();

    await checkoutPage.fillCardDetails(
        '4242 4242 4242 4242',
        'QA Tester',
        '12/29'
    );

    const checkoutResponsePromise = page.waitForResponse(response =>
        response.url().endsWith('/api/v1/orders') &&
        response.request().method() === 'POST'
    );

    await checkoutPage.placeOrder();

    const checkoutResponse = await checkoutResponsePromise;

    expect(checkoutResponse.status()).toBe(201);

    const checkoutBody = await checkoutResponse.json();

    const createdOrderId = checkoutBody.order.id as number;
    const createdOrderNumber = checkoutBody.order.order_no as string;

    expect(createdOrderId).toBeTruthy();

    // console.log('Order ID:', createdOrderId);
    // console.log('Order number:', createdOrderNumber);

    await expect(
        page.getByRole('heading', { name: 'Your order is placed' })
    ).toBeVisible();


    const loginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: sandbox.demoUser.password,
        },
    });

    // console.log('API login status:', loginResponse.status());

    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json() as LoginResponse;

    expect(loginBody.token).toBeTruthy();

    const orderResponse = await api.get(
        `/api/v1/orders/${createdOrderId}`,
        {
            headers: {
                Authorization: `Bearer ${loginBody.token}`,
            },
        }
    );

  
    const orderResponseBody = await orderResponse.text();

    if (orderResponse.status() !== 200) {
        // console.log('API order lookup body:', orderResponseBody);
    }

    expect(orderResponse.status()).toBe(200);

    const orderBody = JSON.parse(orderResponseBody) as OrderResponse;
    const apiOrder = orderBody.order;

    expect(apiOrder.id).toBe(createdOrderId);
    expect(apiOrder.order_no).toBe(createdOrderNumber);
    expect(apiOrder.status).toBe('paid');


    const databaseOrder = await getOrderById(
        String(createdOrderId),
        sandbox.sandboxId
    );

    expect(databaseOrder).not.toBeNull();

    expect(databaseOrder!.id).toBe(String(createdOrderId));
    expect(databaseOrder!.order_no).toBe(createdOrderNumber);
    expect(databaseOrder!.status).toBe('paid');

    const databaseItems = await getOrderItemsByOrderId(
        String(createdOrderId),
        sandbox.sandboxId
    );

    const financialSummary = await getOrderFinancialSummary(
        String(createdOrderId),
        sandbox.sandboxId
    );

    if (!financialSummary) {
        throw new Error(
            `No financial summary found for order ${createdOrderId}`
        );
    }

    expect(Number(financialSummary.subtotal)).toBeCloseTo(
        Number(financialSummary.items_subtotal),
        2
    );

    expect(Number(financialSummary.grand_total)).toBeCloseTo(
        Number(financialSummary.subtotal) -
        Number(financialSummary.discount_total) +
        Number(financialSummary.shipping_total),
        2
    );

    expect(databaseItems.length).toBeGreaterThan(0);
    expect(databaseItems.length).toBe(orderBody.items.length);

    for (const databaseItem of databaseItems) {
        const apiItem = orderBody.items.find(
            item => item.variant_sku === databaseItem.sku
        );

        expect(apiItem).toBeDefined();
        expect(databaseItem.qty).toBe(apiItem!.qty);

        expect(Number(databaseItem.unit_price)).toBeCloseTo(
            apiItem!.unit_price,
            2
        );

        expect(Number(databaseItem.line_total)).toBeCloseTo(
            apiItem!.line_total,
            2
        );
    }

    expect(Number(databaseOrder!.subtotal)).toBeCloseTo(
        apiOrder.subtotal,
        2
    );

    expect(Number(databaseOrder!.grand_total)).toBeCloseTo(
        apiOrder.grand_total,
        2
    );

    // console.log('Database order verification successful.');
    // console.log('Database item count:', databaseItems.length);
    // console.log('Database order status:', databaseOrder!.status);

});

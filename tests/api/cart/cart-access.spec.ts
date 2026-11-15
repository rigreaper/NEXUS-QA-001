//faker is used here, still new on faker
import { test, expect } from '../../../src/fixtures/api.fixture.js';
import { createCustomer } from '../../../src/data/factories/customer.factory.js';

test('API returns 404 when retrieving a nonexistent cart', async ({ api }) => {
    const response = await api.get('/api/v1/carts/999999999');

    expect(response.status()).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('guest cannot retrieve an authenticated users cart', async ({
    api,
    sandbox,
}) => {
    const loginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: sandbox.demoUser.password,
        },
    });

    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    const token = loginBody.token;

    expect(token).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const response = await api.get(`/api/v1/carts/${cartId}`);

    expect(response.status()).toBe(403);
});


test('authenticated user cannot retrieve another users cart', async ({
    api,
    sandbox,
}) => {
    const firstLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: sandbox.demoUser.password,
        },
    });

    expect(firstLoginResponse.status()).toBe(200);

    const firstLoginBody = await firstLoginResponse.json();
    const firstUserToken = firstLoginBody.token;

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${firstUserToken}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const secondCustomer = createCustomer();
    const secondUserPassword = 'Password123!';

    const registerResponse = await api.post('/api/v1/auth/register', {
        data: {
            email: secondCustomer.email,
            password: secondUserPassword,
            name: secondCustomer.name,
        },
    });

    expect(registerResponse.status()).toBe(201);

    const secondLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: secondCustomer.email,
            password: secondUserPassword,
        },
    });

    expect(secondLoginResponse.status()).toBe(200);

    const secondLoginBody = await secondLoginResponse.json();
    const secondUserToken = secondLoginBody.token;

    const response = await api.get(`/api/v1/carts/${cartId}`, {
        headers: {
            Authorization: `Bearer ${secondUserToken}`,
        },
    });

    expect(response.status()).toBe(403);
});


test('guest cannot add an item to an authenticated users cart', async ({
    api,
    sandbox,
}) => {
    const loginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: sandbox.demoUser.password,
        },
    });

    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    const token = loginBody.token;

    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=1'
    );

    expect(productsResponse.status()).toBe(200);

    const productsBody = await productsResponse.json();
    const productId = productsBody.items[0].id;

    const variantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(variantsResponse.status()).toBe(200);

    const variantsBody = await variantsResponse.json();

    const availableVariant = variantsBody.variants.find(
        (variant: { available: number }) => variant.available >= 2
    );

    expect(availableVariant).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const ownerAddResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(ownerAddResponse.status()).toBe(201);

    const guestAddResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(guestAddResponse.status()).toBe(403);

    const ownerCartResponse = await api.get(
        `/api/v1/carts/${cartId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    expect(ownerCartResponse.status()).toBe(200);

    const ownerCartBody = await ownerCartResponse.json();

    expect(ownerCartBody.items).toHaveLength(1);
    expect(ownerCartBody.items[0].qty).toBe(1);
    expect(ownerCartBody.itemCount).toBe(1);
});


test('authenticated user cannot add an item to another users cart', async ({
    api,
    sandbox,
}) => {
    const ownerLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: sandbox.demoUser.password,
        },
    });

    expect(ownerLoginResponse.status()).toBe(200);

    const ownerLoginBody = await ownerLoginResponse.json();
    const ownerToken = ownerLoginBody.token;

    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=1'
    );

    expect(productsResponse.status()).toBe(200);

    const productsBody = await productsResponse.json();
    const productId = productsBody.items[0].id;

    const variantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(variantsResponse.status()).toBe(200);

    const variantsBody = await variantsResponse.json();

    const availableVariant = variantsBody.variants.find(
        (variant: { available: number }) => variant.available >= 2
    );

    expect(availableVariant).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${ownerToken}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const ownerAddResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            headers: {
                Authorization: `Bearer ${ownerToken}`,
            },
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(ownerAddResponse.status()).toBe(201);

    const secondUserEmail = `nexus-${Date.now()}@example.com`;
    const secondUserPassword = 'Password123!';

    const registerResponse = await api.post('/api/v1/auth/register', {
        data: {
            email: secondUserEmail,
            password: secondUserPassword,
            name: 'Nexus Test User',
        },
    });

    expect(registerResponse.status()).toBe(201);

    const secondLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: secondUserEmail,
            password: secondUserPassword,
        },
    });

    expect(secondLoginResponse.status()).toBe(200);

    const secondLoginBody = await secondLoginResponse.json();
    const secondUserToken = secondLoginBody.token;

    const secondUserAddResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            headers: {
                Authorization: `Bearer ${secondUserToken}`,
            },
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(secondUserAddResponse.status()).toBe(403);

    const ownerCartResponse = await api.get(
        `/api/v1/carts/${cartId}`,
        {
            headers: {
                Authorization: `Bearer ${ownerToken}`,
            },
        }
    );

    expect(ownerCartResponse.status()).toBe(200);

    const ownerCartBody = await ownerCartResponse.json();

    expect(ownerCartBody.items).toHaveLength(1);
    expect(ownerCartBody.items[0].qty).toBe(1);
    expect(ownerCartBody.itemCount).toBe(1);
});



test('authenticated user cannot update an item in another users cart', async ({
    api,
    sandbox,
}) => {
    const ownerLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: sandbox.demoUser.password,
        },
    });

    expect(ownerLoginResponse.status()).toBe(200);

    const ownerLoginBody = await ownerLoginResponse.json();
    const ownerToken = ownerLoginBody.token;

    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=1'
    );

    expect(productsResponse.status()).toBe(200);

    const productsBody = await productsResponse.json();
    const productId = productsBody.items[0].id;

    const variantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(variantsResponse.status()).toBe(200);

    const variantsBody = await variantsResponse.json();

    const availableVariant = variantsBody.variants.find(
        (variant: { available: number }) => variant.available >= 3
    );

    expect(availableVariant).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${ownerToken}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            headers: {
                Authorization: `Bearer ${ownerToken}`,
            },
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(addResponse.status()).toBe(201);

    const addBody = await addResponse.json();
    const itemId = addBody.items[0].id;

    const secondUserEmail = `nexus-${Date.now()}@example.com`;
    const secondUserPassword = 'Password123!';

    const registerResponse = await api.post('/api/v1/auth/register', {
        data: {
            email: secondUserEmail,
            password: secondUserPassword,
            name: 'Nexus Test User',
        },
    });

    expect(registerResponse.status()).toBe(201);

    const secondLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: secondUserEmail,
            password: secondUserPassword,
        },
    });

    expect(secondLoginResponse.status()).toBe(200);

    const secondLoginBody = await secondLoginResponse.json();
    const secondUserToken = secondLoginBody.token;

    const updateResponse = await api.patch(
        `/api/v1/carts/${cartId}/items/${itemId}`,
        {
            headers: {
                Authorization: `Bearer ${secondUserToken}`,
            },
            data: {
                qty: 3,
            },
        }
    );

    expect(updateResponse.status()).toBe(403);

    const ownerCartResponse = await api.get(
        `/api/v1/carts/${cartId}`,
        {
            headers: {
                Authorization: `Bearer ${ownerToken}`,
            },
        }
    );

    expect(ownerCartResponse.status()).toBe(200);

    const ownerCartBody = await ownerCartResponse.json();

    expect(ownerCartBody.items).toHaveLength(1);
    expect(ownerCartBody.items[0].id).toBe(itemId);
    expect(ownerCartBody.items[0].qty).toBe(1);
    expect(ownerCartBody.itemCount).toBe(1);
});


test('authenticated user cannot remove an item from another users cart', async ({
    api,
    sandbox,
}) => {
    const ownerLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: sandbox.demoUser.password,
        },
    });

    expect(ownerLoginResponse.status()).toBe(200);

    const ownerLoginBody = await ownerLoginResponse.json();
    const ownerToken = ownerLoginBody.token;

    const productsResponse = await api.get(
        '/api/v1/products?page=1&size=1'
    );

    expect(productsResponse.status()).toBe(200);

    const productsBody = await productsResponse.json();
    const productId = productsBody.items[0].id;

    const variantsResponse = await api.get(
        `/api/v1/products/${productId}/variants`
    );

    expect(variantsResponse.status()).toBe(200);

    const variantsBody = await variantsResponse.json();

    const availableVariant = variantsBody.variants.find(
        (variant: { available: number }) => variant.available > 0
    );

    expect(availableVariant).toBeTruthy();

    const cartResponse = await api.post('/api/v1/carts', {
        headers: {
            Authorization: `Bearer ${ownerToken}`,
        },
    });

    expect(cartResponse.status()).toBe(201);

    const cartBody = await cartResponse.json();
    const cartId = cartBody.cart.id;

    const addResponse = await api.post(
        `/api/v1/carts/${cartId}/items`,
        {
            headers: {
                Authorization: `Bearer ${ownerToken}`,
            },
            data: {
                variantId: availableVariant.id,
                qty: 1,
            },
        }
    );

    expect(addResponse.status()).toBe(201);

    const addBody = await addResponse.json();
    const itemId = addBody.items[0].id;

    const secondUserEmail = `nexus-${Date.now()}@example.com`;
    const secondUserPassword = 'Password123!';

    const registerResponse = await api.post('/api/v1/auth/register', {
        data: {
            email: secondUserEmail,
            password: secondUserPassword,
            name: 'Nexus Test User',
        },
    });

    expect(registerResponse.status()).toBe(201);

    const secondLoginResponse = await api.post('/api/v1/auth/login', {
        data: {
            email: secondUserEmail,
            password: secondUserPassword,
        },
    });

    expect(secondLoginResponse.status()).toBe(200);

    const secondLoginBody = await secondLoginResponse.json();
    const secondUserToken = secondLoginBody.token;

    const deleteResponse = await api.delete(
        `/api/v1/carts/${cartId}/items/${itemId}`,
        {
            headers: {
                Authorization: `Bearer ${secondUserToken}`,
            },
        }
    );

    expect(deleteResponse.status()).toBe(403);

    const ownerCartResponse = await api.get(
        `/api/v1/carts/${cartId}`,
        {
            headers: {
                Authorization: `Bearer ${ownerToken}`,
            },
        }
    );

    expect(ownerCartResponse.status()).toBe(200);

    const ownerCartBody = await ownerCartResponse.json();

    expect(ownerCartBody.items).toHaveLength(1);
    expect(ownerCartBody.items[0].id).toBe(itemId);
    expect(ownerCartBody.items[0].qty).toBe(1);
    expect(ownerCartBody.itemCount).toBe(1);
});



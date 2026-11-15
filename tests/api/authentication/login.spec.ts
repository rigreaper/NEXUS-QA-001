import { test, expect } from '../../../src/fixtures/api.fixture.js';
import { authenticationTestData } from '../../../src/data/authentication-test-data.js';

test('user can log in with valid credentials', async ({
    api,
    sandbox,
}) => {
    const response = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: sandbox.demoUser.password,
        },
    });
    

    expect(response.status()).toBe(200);

    const body = await response.json();

    // console.log('User response:', body.user);
    // console.log('User fields:', Object.keys(body.user));

    expect(body.token).toBeTruthy();
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBeGreaterThan(0);
    expect(Date.parse(body.expiresAt)).not.toBeNaN();

    expect(body.user.id).toBeTruthy();
    expect(body.user.email).toBe(sandbox.demoUser.email);
    expect(body.user.name).toBeTruthy();

    const meResponse = await api.get('/api/v1/auth/me', {
        headers: {
            Authorization: `Bearer ${body.token}`,
        },
    });

    expect(meResponse.status()).toBe(200);
        
    const meBody = await meResponse.json();

    //console.log( meBody);
    expect(meBody.user.id).toBe(body.user.id);
    expect(meBody.user.email).toBe(sandbox.demoUser.email);
    expect(meBody.user.name).toBe(body.user.name);
    expect(meBody.user.is_active).toBe(true);
    expect(meBody.user.order_count).toBeGreaterThanOrEqual(0);

});

test('user cannot log in with an incorrect password', async ({
    api,
    sandbox,
}) => {
    const response = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: authenticationTestData.invalidPassword.password,
        },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();

    //console.log(await response.json());

    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('user cannot log in with an unknown email', async ({
    api,
    sandbox,
}) => {
    const response = await api.post('/api/v1/auth/login', {
        data: {
            email: authenticationTestData.invalidEmail.email,
            password: sandbox.demoUser.password,
        },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();

    //console.log(await response.json());

    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('user cannot log in with empty credentials', async ({ api }) => {
    
    const response = await api.post('/api/v1/auth/login', {
        data: authenticationTestData.emptyCredentials,
    });
    
    // console.log('Status:', response.status());
    // console.log('Body:', await response.json());

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});


test('user cannot log in with an empty email', async ({
    api,
    sandbox,
}) => {
    const response = await api.post('/api/v1/auth/login', {
        data: {
            email: authenticationTestData.emptyEmail.email,
            password: sandbox.demoUser.password,
        },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();

    //console.log(await response.json());

    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('user cannot log in with an empty password', async ({
    api,
    sandbox,
}) => {
    const response = await api.post('/api/v1/auth/login', {
        data: {
            email: sandbox.demoUser.email,
            password: authenticationTestData.emptyPassword.password,
        },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();

    //console.log(await response.json());

    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});
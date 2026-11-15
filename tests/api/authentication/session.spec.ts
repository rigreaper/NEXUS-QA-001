import { test, expect } from '../../../src/fixtures/api.fixture.js';
import { authenticationTestData } from '../../../src/data/authentication-test-data.js';


test('authenticated user can access their profile', async ({
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

    const meResponse = await api.get('/api/v1/auth/me', {
        headers: {
            Authorization: `Bearer ${loginBody.token}`,
        },
    });

    expect(meResponse.status()).toBe(200);

    const meBody = await meResponse.json();

    expect(meBody.user.id).toBe(loginBody.user.id);
    expect(meBody.user.email).toBe(sandbox.demoUser.email);
    expect(meBody.user.name).toBe(loginBody.user.name);
});

test('unauthenticated user cannot access their profile', async ({
    api,
}) => {
    const response = await api.get('/api/v1/auth/me');

    expect(response.status()).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('user cannot access their profile with an invalid token', async ({
    api,
}) => {
    const response = await api.get('/api/v1/auth/me', {
        headers: {
            Authorization: 'Bearer invalid-token-123',
        },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

test('user cannot access their profile after logging out', async ({
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

    const beforeLogoutResponse = await api.get('/api/v1/auth/me', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(beforeLogoutResponse.status()).toBe(200);

    const logoutResponse = await api.post('/api/v1/auth/logout', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(logoutResponse.status()).toBe(204);

    const afterLogoutResponse = await api.get('/api/v1/auth/me', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(afterLogoutResponse.status()).toBe(401);
});

test('user can refresh their session and old token is revoked', async ({
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
    const oldToken = loginBody.token;

    const refreshResponse = await api.post('/api/v1/auth/refresh', {
        headers: {
            Authorization: `Bearer ${oldToken}`,
        },
    });

    expect(refreshResponse.status()).toBe(200);

    const refreshBody = await refreshResponse.json();

    expect(refreshBody.token).toBeTruthy();
    expect(refreshBody.token).not.toBe(oldToken);
    expect(refreshBody.tokenType).toBe('Bearer');
    expect(refreshBody.expiresIn).toBeGreaterThan(0);
    expect(Date.parse(refreshBody.expiresAt)).not.toBeNaN();

    const newTokenResponse = await api.get('/api/v1/auth/me', {
        headers: {
            Authorization: `Bearer ${refreshBody.token}`,
        },
    });

    expect(newTokenResponse.status()).toBe(200);

    const oldTokenResponse = await api.get('/api/v1/auth/me', {
        headers: {
            Authorization: `Bearer ${oldToken}`,
        },
    });

    expect(oldTokenResponse.status()).toBe(401);
});


test('unauthenticated user cannot refresh their session', async ({
    api,
}) => {
    const response = await api.post('/api/v1/auth/refresh');

    expect(response.status()).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
});

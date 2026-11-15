import {
    test as base,
    expect,
    request as requestFactory,
    type APIRequestContext,
} from '@playwright/test';

import { testConfig } from '../config/test-config.js';

type Sandbox = {
    sandboxId: string;
    apiKey: string;
    label: string | null;
    createdAt: string;
    expiresAt: string;
    howToUse: string;
    demoUser: {
        email: string;
        password: string;
    };
};

type ApiFixtures = {
    sandbox: Sandbox;
    api: APIRequestContext;
};

export const test = base.extend<ApiFixtures>({

    api: async ({ sandbox }, use) => {
        const apiContext = await requestFactory.newContext({
            baseURL: testConfig.apiBaseURL,
            extraHTTPHeaders: {
                'X-Sandbox-Key': sandbox.apiKey,
            },
        });

        try {
            await use(apiContext);
        } finally {
            await apiContext.dispose();
        }
    },

    sandbox: async ({}, use) => {
        const context = await requestFactory.newContext({
            baseURL: testConfig.apiBaseURL,
        });

        try {
            const response = await context.post('/api/v1/sandbox', {
                data: {
                    label: 'nexus-qa-api-tests',
                },
            });

            expect(response.status()).toBe(201); //200?

            const sandbox = await response.json() as Sandbox;

            await use(sandbox);
        } finally {
            await context.dispose();
        }
    },
});

export { expect };
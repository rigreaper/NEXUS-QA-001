import { test as uiTest, expect } from './test.fixture.js';
import {
    request as requestFactory,
    type APIRequestContext,
} from '@playwright/test';
import { testConfig } from '../config/test-config.js';

type Sandbox = {
    sandboxId: string;
    apiKey: string;
    demoUser: {
        email: string;
        password: string;
    };
};

type IntegrationFixtures = {
    sandbox: Sandbox;
    api: APIRequestContext;
};

export const test = uiTest.extend<IntegrationFixtures>({
    sandbox: async ({}, use) => {
        const context = await requestFactory.newContext({
            baseURL: testConfig.apiBaseURL,
        });

        try {
            const response = await context.post('/api/v1/sandbox', {
                data: {
                    label: 'nexus-qa-ui-api-db',
                },
            });

            expect(response.status()).toBe(201);

            const sandbox = await response.json() as Sandbox;

            await use(sandbox);
        } finally {
            await context.dispose();
        }
    },

    api: async ({ sandbox }, use) => {
        const context = await requestFactory.newContext({
            baseURL: testConfig.apiBaseURL,
            extraHTTPHeaders: {
                'X-Sandbox-Key': sandbox.apiKey,
            },
        });

        try {
            await use(context);
        } finally {
            await context.dispose();
        }
    },
});

export { expect };

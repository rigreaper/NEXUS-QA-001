import { defineConfig } from '@playwright/test';
import { testConfig } from './src/config/test-config.js';

export default defineConfig({
    testDir: './tests',

    fullyParallel: true,
    ...(process.env.CI ? { workers: 1 } : {}),

    reporter: [
        ['list'],
        ['html', { open: 'never' }],
    ],

    use: {
        baseURL: testConfig.baseURL,
        trace: 'retain-on-failure',
    },

    projects: [
        {
            name: 'ai',
            testMatch: '**/ai/**/*.spec.ts',
            use: {
                browserName: 'chromium',
            },
        },

        {
            name: 'api',
            testMatch: '**/api/**/*.spec.ts',
        },
        
        {
            name: 'chromium',
            testMatch: '**/ui/**/*.spec.ts',
            use: {
                browserName: 'chromium',
            },
        },
        {
            name: 'firefox',
            testMatch: '**/ui/**/*.spec.ts',
            use: {
                browserName: 'firefox',
            },
        },

        {
            name: 'database',
            testMatch: '**/database/**/*.spec.ts',
        },

        {
            name: 'integration',
            testMatch: '**/integration/**/*.spec.ts',
            use: {
                serviceWorkers: 'block',
            },
        }
    ],
});

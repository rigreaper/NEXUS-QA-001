
import 'dotenv/config';

import { expect, test } from '@playwright/test';

import { testConfig } from '../../src/config/test-config.js';
import { nx } from '../../src/ai/nx.js';

const hasOpenAIConfig = Boolean(
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_MODEL,
);

test.describe('AI self-healing integration', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(
            !hasOpenAIConfig,
            'OPENAI_API_KEY or OPENAI_MODEL is not configured.',
        );

        await page.goto(
            `${testConfig.baseURL}${testConfig.qaShopPath}`,
        );
    });

    test('recovers from an incorrect locator using real OpenAI', async ({
        page,
    }) => {
        test.setTimeout(60_000);
        page.setDefaultTimeout(2_000);
        const incorrectLocator = page.getByTestId(
            'intentionally-wrong-login-button',
        );

        await nx.click(
            page,
            incorrectLocator,
            {
                target: 'Login button',
                context: 'QA-Shop page; button opens the login dialog.',
            },
        );

        await expect(
            page.getByTestId('giris-eposta'),
        ).toBeVisible();
    });

    test('recovers from a second incorrect locator using real OpenAI', async ({
        page,
    }) => {
        test.setTimeout(60_000);
        page.setDefaultTimeout(2_000);

        await page.setContent(`
            <button
                data-testid="account-login"
                onclick="this.dataset.clicked = 'true'"
            >
                Login
            </button>
        `);

        await nx.click(
            page,
            page.getByTestId('intentionally-wrong-account-login'),
            {
                target: 'Login button',
                context: 'Account access page',
            },
        );

        await expect(
            page.getByTestId('account-login'),
        ).toHaveAttribute('data-clicked', 'true');

        const attachment = test.info().attachments.find(
            (item) =>
                item.name.startsWith('nexus-self-healing-') &&
                item.contentType === 'application/json',
        );

        expect(attachment?.body).toBeDefined();

        const record = JSON.parse(
            attachment!.body!.toString('utf8'),
        ) as {
            status: string;
        };

        expect(record.status).toBe('HEALED_PASS');
    });

    test('rejects an unrelated candidate and preserves the original failure', async ({
        page,
    }) => {
        page.setDefaultTimeout(2_000);

        const incorrectLocator = page.getByTestId(
            'non-existent-emergency-control',
        );

        let originalError: unknown;

        try {
            await nx.click(
                page,
                incorrectLocator,
                {
                    target: 'Quantum reactor self-destruct authorization control',
                    context: 'This control does not exist on QA-Shop.',
                },
            );
        } catch (error) {
            originalError = error;
        }

        expect(originalError).toBeInstanceOf(Error);

        const attachment = test.info().attachments.find(
            (item) =>
                item.name.startsWith('nexus-self-healing-') &&
                item.contentType === 'application/json',
        );

        expect(attachment?.body).toBeDefined();

        const record = JSON.parse(
            attachment!.body!.toString('utf8'),
        ) as {
            status: string;
            retrySucceeded?: boolean;
        };

        expect(record.status).toBe('HEALING_FAILED');
        expect(record.retrySucceeded).toBe(false);

        await expect(
            page.getByTestId('giris-eposta'),
        ).not.toBeVisible();
    });
});

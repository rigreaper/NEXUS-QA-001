
import { test, expect } from '@playwright/test';

import { nx } from '../../src/ai/nx.js';

test.describe('NEXUS-QA self-healing — mock tests', () => {
    test.describe.configure({ mode: 'serial' });

    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.OPENAI_API_KEY;
    const originalModel = process.env.OPENAI_MODEL;

    let fetchCalls = 0;

    function mockOpenAI(candidate: {
        strategy: 'role' | 'label' | 'testId';
        role: string;
        value: string;
        reason: string;
    }): void {
        globalThis.fetch = async () => {
            fetchCalls++;

            return new Response(
                JSON.stringify({
                    output: [
                        {
                            type: 'message',
                            content: [
                                {
                                    type: 'output_text',
                                    text: JSON.stringify({
                                        decision: 'candidate',
                                        ...candidate,
                                    }),
                                },
                            ],
                        },
                    ],
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );
        };
    }

    test.beforeEach(() => {
        fetchCalls = 0;

        process.env.OPENAI_API_KEY = 'mock-test-key';
        process.env.OPENAI_MODEL = 'mock-test-model';
    });

    test.afterEach(() => {
        globalThis.fetch = originalFetch;

        if (originalApiKey === undefined) {
            delete process.env.OPENAI_API_KEY;
        } else {
            process.env.OPENAI_API_KEY = originalApiKey;
        }

        if (originalModel === undefined) {
            delete process.env.OPENAI_MODEL;
        } else {
            process.env.OPENAI_MODEL = originalModel;
        }
    });

    test('normal click succeeds without calling OpenAI', async ({ page }) => {
        await page.setContent(`
            <button id="login" onclick="this.dataset.clicked = 'true'">
                Open login dialog
            </button>
        `);

        await nx.click(
            page,
            page.getByRole('button', {
                name: 'Open login dialog',
            }),
            {
                target: 'Open login dialog button',
                context: 'QA-Shop login page',
            },
        );

        await expect(
            page.getByRole('button', {
                name: 'Open login dialog',
            }),
        ).toHaveAttribute('data-clicked', 'true');

        expect(fetchCalls).toBe(0);
    });

    test('recovers from an incorrect test ID and retries successfully', async ({ page }) => {
        await page.setContent(`
            <button
                id="login"
                onclick="this.dataset.clicked = 'true'"
            >
                Open login dialog
            </button>
        `);

        page.setDefaultTimeout(500);

        mockOpenAI({
            strategy: 'role',
            role: 'button',
            value: 'Open login dialog',
            reason: 'The button matches the requested login action.',
        });

        await nx.click(
            page,
            page.getByTestId('incorrect-login-button'),
            {
                target: 'Open login dialog button',
                context: 'QA-Shop login page',
            },
        );

        await expect(
            page.getByRole('button', {
                name: 'Open login dialog',
            }),
        ).toHaveAttribute('data-clicked', 'true');

        expect(fetchCalls).toBe(1);
    });

    test('rejects an irrelevant AI candidate and preserves the original failure', async ({ page }) => {
        await page.setContent(`
            <button id="login">Open login dialog</button>
            <button id="logout">Sign out</button>
        `);

        page.setDefaultTimeout(500);

        mockOpenAI({
            strategy: 'role',
            role: 'button',
            value: 'Delete account',
            reason: 'This is supposedly the requested action.',
        });

        await expect(
            nx.click(
                page,
                page.getByTestId('incorrect-login-button'),
                {
                    target: 'Open login dialog button',
                    context: 'QA-Shop login page',
                },
            ),
        ).rejects.toThrow(/Timeout/i);

        await expect(
            page.getByRole('button', {
                name: 'Open login dialog',
            }),
        ).not.toHaveAttribute('data-clicked', 'true');

        await expect(
            page.getByRole('button', {
                name: 'Sign out',
            }),
        ).not.toHaveAttribute('data-clicked', 'true');

        expect(fetchCalls).toBe(1);
    });

    test('does not call OpenAI when the original locator matches multiple elements', async ({ page }) => {
        await page.setContent(`
            <button data-testid="duplicate">First button</button>
            <button data-testid="duplicate">Second button</button>
        `);

        page.setDefaultTimeout(500);

        await expect(
            nx.click(
                page,
                page.getByTestId('duplicate'),
                {
                    target: 'First button',
                    context: 'Duplicate locator test',
                },
            ),
        ).rejects.toThrow(/strict mode violation/i);

        expect(fetchCalls).toBe(0);
    });

    test('recovers from an incorrect locator during fill', async ({ page }) => {
        await page.setContent(`
            <label for="email">Email</label>
            <input id="email" type="email" />
        `);

        page.setDefaultTimeout(500);

        mockOpenAI({
            strategy: 'label',
            role: 'none',
            value: 'Email',
            reason: 'The email field has the matching label.',
        });

        await nx.fill(
            page,
            page.getByTestId('incorrect-email'),
            {
                target: 'Email input',
                context: 'Login form',
            },
            'demo@example.com',
        );

        await expect(page.getByLabel('Email')).toHaveValue(
            'demo@example.com',
        );

        expect(fetchCalls).toBe(1);
    });

    test('does not call OpenAI for a disabled button', async ({ page }) => {
        await page.setContent(`
            <button disabled>Submit</button>
        `);

        page.setDefaultTimeout(500);

        await expect(
            nx.click(
                page,
                page.getByRole('button', { name: 'Submit' }),
                {
                    target: 'Submit button',
                    context: 'Form',
                },
            ),
        ).rejects.toThrow();

        expect(fetchCalls).toBe(0);
    });

    test('preserves original failure when OpenAI is unavailable', async ({ page }) => {
        await page.setContent(`
            <button>Open login dialog</button>
        `);

        page.setDefaultTimeout(500);

        globalThis.fetch = async () => {
            fetchCalls++;

            return new Response(
                JSON.stringify({ error: { message: 'Service unavailable' } }),
                { status: 503 },
            );
        };

        await expect(
            nx.click(
                page,
                page.getByTestId('incorrect-login-button'),
                {
                    target: 'Open login dialog button',
                    context: 'QA-Shop login page',
                },
            ),
        ).rejects.toThrow(/Timeout/i);

        expect(fetchCalls).toBe(1);
    });

    test('preserves original failure when the recovered action also fails', async ({ page }) => {
        await page.setContent(`
            <button id="login">Open login dialog</button>
            <div
                style="
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    background: transparent;
                "
            ></div>
        `);

        page.setDefaultTimeout(500);

        mockOpenAI({
            strategy: 'role',
            role: 'button',
            value: 'Open login dialog',
            reason: 'The button matches the intended target.',
        });

        await expect(
            nx.click(
                page,
                page.getByTestId('incorrect-login-button'),
                {
                    target: 'Open login dialog button',
                    context: 'QA-Shop login page',
                },
            ),
        ).rejects.toThrow(/Timeout/i);

        expect(fetchCalls).toBe(1);
    });

    test('does not retry when AI abstains from proposing a locator', async ({ page }) => {
        await page.setContent(`
            <button>Open login dialog</button>
        `);

        page.setDefaultTimeout(500);

        globalThis.fetch = async () => {
            fetchCalls++;

            return new Response(
                JSON.stringify({
                    output: [
                        {
                            type: 'message',
                            content: [
                                {
                                    type: 'output_text',
                                    text: JSON.stringify({
                                        decision: 'abstain',
                                        strategy: 'none',
                                        role: 'none',
                                        value: '',
                                        reason: 'The available evidence is insufficient.',
                                    }),
                                },
                            ],
                        },
                    ],
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );
        };

        await expect(
            nx.click(
                page,
                page.getByTestId('incorrect-login-button'),
                {
                    target: 'Open login dialog button',
                    context: 'QA-Shop login page',
                },
            ),
        ).rejects.toThrow(/Timeout/i);

        expect(fetchCalls).toBe(1);

        await expect(
            page.getByRole('button', {
                name: 'Open login dialog',
            }),
        ).not.toHaveAttribute('data-clicked', 'true');
    });
});

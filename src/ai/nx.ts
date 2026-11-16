import type { Locator, Page } from '@playwright/test';

import {
    executeAction,
    type ActionIntent,
} from './self-healing.js';

export const nx = {
    async click(
        page: Page,
        locator: Locator,
        intent: ActionIntent,
    ): Promise<void> {
        await executeAction(page, locator, intent, 'click');
    },

    async fill(
        page: Page,
        locator: Locator,
        intent: ActionIntent,
        value: string,
    ): Promise<void> {
        await executeAction(page, locator, intent, 'fill', value);
    },
};
import {chromium, expect as playwrightExpect} from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import express from "express";

// === Utility helpers for playwright tests environment ===
export function createPlaywrightHooks(headless = true) {
    let browser, context, page;

    beforeAll(async () => {
        browser = await chromium.launch({headless});
        context = await browser.newContext();
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        page = await context.newPage();
        const app = express();
        app.get('/', (req, res) => {
            res.send('<!DOCTYPE html><html><body></body></html>');
        });
        const server = app.listen(0);
        const port = server.address().port;
        await page.goto(`http://localhost:${port}`);
        server.close();
    });

    afterEach(async () => {
        await page.close();
    });

    return {getPage: () => page};
}

// === Few utility helpers for playwright tests actions ===
export async function waitForCustomEvent(page: Page, eventName: string): Promise<unknown> {
    return page.evaluate(
        ([eventName]) => {
            return new Promise((resolve) => {
                window.addEventListener(eventName, (eventObj: any) => {
                    resolve(eventObj.detail);
                }, { once: true });
            });
        },
        [eventName]
    );
}

// ==== Create jest matchers from playwright matchers ====
// https://playwright.dev/docs/test-assertions#list-of-assertions
const matcherNames= [
    'toContainText', 'toBeVisible', 'toBeHidden', 'toBeDisabled', 'toBeEnabled', 'toBeFocused',
    'toHaveCount'
] as const;

type MatcherName = typeof matcherNames[number];

type CustomMatchers<R = unknown> = {
    [K in MatcherName]: (...args: any[]) => Promise<R>;
};

declare global {
    namespace jest {
        interface Matchers<R> extends CustomMatchers<R> {}
    }
}

// Create all matchers automatically
const matchers = Object.fromEntries(
    matcherNames.map(name => [
        name,
        async function(elementHandle: Locator, ...args: any[]) {
            try {
                // @ts-ignore - using dynamic method name
                await playwrightExpect(elementHandle)[name](...args);
                return { pass: true, message: () => '' };
            } catch (e) {
                return { pass: false, message: () => (e as Error).message || String(e) };
            }
        }
    ])
);

expect.extend(matchers);
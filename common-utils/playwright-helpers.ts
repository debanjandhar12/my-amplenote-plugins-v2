import {chromium, expect as playwrightExpect} from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import express from "express";

// === Utility helpers for playwright tests environment ===
export function createPlaywrightHooks(headless = true) {
    let browser, context, page, server;

    beforeAll(async () => {
        const app = express();
        app.get('/', (req, res) => {
            res.send('<!DOCTYPE html><html><body></body></html>');
        });
        server = app.listen(0);
        browser = await chromium.launch({
            headless: headless
        });
    });

    afterAll(async () => {
        await browser.close();
        server.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
        page.on('console', err => {
            if (err.type() === 'error') {
                // Log browser console errors
                console.error(err.text());
            }
        });
        const originalWaitForSelector = page.waitForSelector;
        page.waitForSelector = async (...args) => {
            console.info(`page.waitForSelector: Waiting for ${args[0]}`);
            const result = await originalWaitForSelector.apply(page, args);
            console.info(`page.waitForSelector: Found ${args[0]}`);
            return result;
        };
        await page.goto(`http://localhost:${server.address().port}`);
    });

    afterEach(async () => {
        await page.close();
        await context.close();
    });

    return {getPage: () => page};
}

// === Few utility helpers for playwright tests actions ===
export async function waitForCustomEvent(page: Page, eventName: string): Promise<unknown> {
    console.info(`waitForCustomEvent: Waiting for ${eventName} event to be fired...`);
    const result = await page.evaluate(
        ([eventName]) => {
            return new Promise((resolve) => {
                window.addEventListener(eventName, (eventObj: any) => {
                    resolve(eventObj.detail);
                }, { once: true });
            });
        },
        [eventName]
    );
    console.info(`waitForCustomEvent: Event ${eventName} fired with value: ${JSON.stringify(result)}`);
    return result;
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
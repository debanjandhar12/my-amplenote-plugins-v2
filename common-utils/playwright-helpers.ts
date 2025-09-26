import type {Locator, Page} from '@playwright/test';
import {chromium, expect as playwrightExpected} from '@playwright/test';
import express from "express";
import {allure} from 'jest-allure2-reporter/api';

// === Utility helpers for playwright tests environment ===
export function createPlaywrightHooks(headless = true) {
    let browser, context, page, server;

    beforeAll(async () => {
        const app = express();
        app.get('/', (req, res) => {
            res.send('<!DOCTYPE html><html><head><link rel="icon" href="data:,"></head><body></body></html>');
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

        // Intercept browser console messages and forward them to Node.js console
        page.on('console', (msg) => {
            const logType = msg.type().toUpperCase();
            const logText = msg.text();

            // Forward browser console messages to Node.js console (which will be captured by our setup)
            switch (msg.type()) {
                case 'error':
                    console.error(`[BROWSER] ${logText}`);
                    break;
                case 'warning':
                    console.warn(`[BROWSER] ${logText}`);
                    break;
                case 'info':
                    console.info(`[BROWSER] ${logText}`);
                    break;
                default:
                    console.log(`[BROWSER] ${logText}`);
            }
        });

        // Enhanced waitForSelector with step logging
        const originalWaitForSelector = page.waitForSelector;
        page.waitForSelector = async (...args) => {
            return await allure.step(`Wait for selector: ${args[0]}`, async () => {
                console.info(`page.waitForSelector: Waiting for ${args[0]}`);
                const result = await originalWaitForSelector.apply(page, args);
                console.info(`page.waitForSelector: Found ${args[0]}`);
                return result;
            });
        };

        // Throttle network speed for non-cdn requests
        await context.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            const hostname = url.hostname;

            if (['jsdelivr.net', 'esm.sh'].some(domain => hostname.includes(domain))) {
                return route.continue();
            }

            await new Promise(r => setTimeout(r, 320));
            return route.continue();
        });

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

export async function getSpyInfo(page: Page, spyName: string) {
    return page.evaluate((name) => {
        const parts = name.split('.');
        const spy = parts.reduce((obj, prop) => obj && obj[prop], window as any);

        if (!spy) {
            return { callCount: 0, args: [] };
        }

        return { callCount: spy.callCount, args: spy.args };
    }, spyName);
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
    try {
        const screenshot = await page.screenshot({fullPage: true});
        await allure.attachment(name, screenshot, 'image/png');
    } catch (error) {
        console.warn(`Failed to take screenshot ${name}:`, error.message);
    }
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
                await playwrightExpected(elementHandle)[name](...args);
                return { pass: true, message: () => '' };
            } catch (e) {
                return { pass: false, message: () => (e as Error).message || String(e) };
            }
        }
    ])
);

expect.extend(matchers);
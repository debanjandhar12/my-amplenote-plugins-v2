import {chromium, expect as playwrightExpect} from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import express from "express";
import { allure } from 'jest-allure2-reporter/api';

// === Utility helpers for playwright tests environment ===
export function createPlaywrightHooks(headless = true) {
    let browser, context, page, server;

    beforeAll(async () => {
        await allure.step('Setup test environment', async () => {
            const app = express();
            app.get('/', (req, res) => {
                res.send('<!DOCTYPE html><html><head><link rel="icon" href="data:,"></head><body></body></html>');
            });
            server = app.listen(0);
            browser = await chromium.launch({
                headless: headless
            });
            allure.parameter('headless', headless);
            allure.parameter('server_port', server.address().port);
        });
    });

    afterAll(async () => {
        await allure.step('Cleanup test environment', async () => {
            await browser.close();
            server.close();
        });
    });

    beforeEach(async () => {
        await allure.step('Initialize browser context and page', async () => {
            context = await browser.newContext();
            page = await context.newPage();
            
            // Enhanced console logging with Allure attachment
            page.on('console', async (msg) => {
                const logMessage = `[${msg.type().toUpperCase()}] ${msg.text()}`;
                console.log(logMessage);
                
                if (msg.type() === 'error') {
                    await allure.attachment('Browser Console Error', logMessage, 'text/plain');
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
            
            await page.goto(`http://localhost:${server.address().port}`);
        });
    });

    afterEach(async () => {
        await allure.step('Cleanup browser context', async () => {
            // Take screenshot on test completion
            try {
                const screenshot = await page.screenshot({ fullPage: true });
                await allure.attachment('Final Screenshot', screenshot, 'image/png');
            } catch (error) {
                console.warn('Failed to take final screenshot:', error.message);
            }
            
            await page.close();
            await context.close();
        });
    });

    return {getPage: () => page};
}

// === Few utility helpers for playwright tests actions ===
export async function waitForCustomEvent(page: Page, eventName: string): Promise<unknown> {
    return await allure.step(`Wait for custom event: ${eventName}`, async () => {
        console.info(`waitForCustomEvent: Waiting for ${eventName} event to be fired...`);
        
        // Take screenshot before waiting
        try {
            const screenshot = await page.screenshot({ fullPage: true });
            await allure.attachment(`Before waiting for ${eventName}`, screenshot, 'image/png');
        } catch (error) {
            console.warn('Failed to take screenshot:', error.message);
        }
        
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
        allure.parameter(`${eventName}_result`, JSON.stringify(result));
        
        // Take screenshot after event fired
        try {
            const screenshot = await page.screenshot({ fullPage: true });
            await allure.attachment(`After ${eventName} event`, screenshot, 'image/png');
        } catch (error) {
            console.warn('Failed to take screenshot:', error.message);
        }
        
        return result;
    });
}

export async function getSpyInfo(page: Page, spyName: string) {
    return await allure.step(`Get spy info for: ${spyName}`, async () => {
        const spyInfo = await page.evaluate((name) => {
            const spy = (window as any)[name];
            if (!spy) return { callCount: 0, args: [] };
            return { callCount: spy.callCount, args: spy.args };
        }, spyName);
        
        allure.parameter(`${spyName}_callCount`, spyInfo.callCount);
        allure.parameter(`${spyName}_args`, JSON.stringify(spyInfo.args));
        
        return spyInfo;
    });
}

// New helper function for taking screenshots with steps
export async function takeScreenshot(page: Page, name: string): Promise<void> {
    await allure.step(`Take screenshot: ${name}`, async () => {
        try {
            const screenshot = await page.screenshot({ fullPage: true });
            await allure.attachment(name, screenshot, 'image/png');
        } catch (error) {
            console.warn(`Failed to take screenshot ${name}:`, error.message);
        }
    });
}

// Enhanced click helper with screenshot
export async function clickWithScreenshot(page: Page, selector: string, description?: string): Promise<void> {
    const stepName = description || `Click element: ${selector}`;
    await allure.step(stepName, async () => {
        // Screenshot before click
        await takeScreenshot(page, `Before ${stepName}`);
        
        const element = await page.waitForSelector(selector);
        await element.click();
        
        // Screenshot after click
        await takeScreenshot(page, `After ${stepName}`);
    });
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
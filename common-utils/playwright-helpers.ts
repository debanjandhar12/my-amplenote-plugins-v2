import {chromium, expect as playwrightExpect} from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import express from "express";
import { allure } from 'jest-allure2-reporter/api';

// === Utility helpers for playwright tests environment ===
export function createPlaywrightHooks(headless = true) {
    let browser, context, page, server;
    let consoleLogs: string[] = [];
    let originalConsoleMethods: {
        log: typeof console.log;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
    };

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
        // Reset console logs for each test
        consoleLogs = [];
        
        await allure.step('Initialize browser context and page', async () => {
            context = await browser.newContext();
            page = await context.newPage();
            
            // Intercept ALL console messages from the browser page
            page.on('console', async (msg) => {
                const timestamp = new Date().toISOString();
                const logType = msg.type().toUpperCase();
                const logText = msg.text();
                const logMessage = `[${timestamp}] [${logType}] ${logText}`;
                
                // Store in per-test collection
                consoleLogs.push(logMessage);
                
                // Also log to Node.js console for immediate visibility (preserving original behavior)
                console.log(logMessage);
                
                // Attach critical errors immediately
                if (msg.type() === 'error') {
                    await allure.attachment('Browser Console Error', logMessage, 'text/plain');
                }
            });

            // Store original console methods
            originalConsoleMethods = {
                log: console.log,
                info: console.info,
                warn: console.warn,
                error: console.error
            };

            // Intercept Node.js console calls within the test context
            console.log = (...args) => {
                const timestamp = new Date().toISOString();
                const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                const logMessage = `[${timestamp}] [NODE_LOG] ${message}`;
                consoleLogs.push(logMessage);
                originalConsoleMethods.log.apply(console, args);
            };

            console.info = (...args) => {
                const timestamp = new Date().toISOString();
                const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                const logMessage = `[${timestamp}] [NODE_INFO] ${message}`;
                consoleLogs.push(logMessage);
                originalConsoleMethods.info.apply(console, args);
            };

            console.warn = (...args) => {
                const timestamp = new Date().toISOString();
                const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                const logMessage = `[${timestamp}] [NODE_WARN] ${message}`;
                consoleLogs.push(logMessage);
                originalConsoleMethods.warn.apply(console, args);
            };

            console.error = (...args) => {
                const timestamp = new Date().toISOString();
                const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                const logMessage = `[${timestamp}] [NODE_ERROR] ${message}`;
                consoleLogs.push(logMessage);
                originalConsoleMethods.error.apply(console, args);
            };

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
            // Restore original console methods first to avoid issues with logging during cleanup
            if (originalConsoleMethods) {
                console.log = originalConsoleMethods.log;
                console.info = originalConsoleMethods.info;
                console.warn = originalConsoleMethods.warn;
                console.error = originalConsoleMethods.error;
            }
            
            // Attach categorized console logs for this test
            if (consoleLogs.length > 0) {
                await attachCategorizedLogs(consoleLogs);
                
                // Also add a summary
                const logSummary = {
                    totalLogs: consoleLogs.length,
                    errorCount: filterConsoleLogs(consoleLogs, { includeTypes: ['error', 'node_error'] }).length,
                    warningCount: filterConsoleLogs(consoleLogs, { includeTypes: ['warning', 'node_warn'] }).length,
                    infoCount: filterConsoleLogs(consoleLogs, { includeTypes: ['info', 'node_info'] }).length,
                    logCount: filterConsoleLogs(consoleLogs, { includeTypes: ['log', 'node_log'] }).length,
                    browserLogCount: filterConsoleLogs(consoleLogs, { includeTypes: ['log', 'info', 'warning', 'error'] }).length,
                    nodeLogCount: filterConsoleLogs(consoleLogs, { includeTypes: ['node_log', 'node_info', 'node_warn', 'node_error'] }).length
                };
                await allure.attachment('Log Summary', JSON.stringify(logSummary, null, 2), 'application/json');
            }
            
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

    return {
        getPage: () => page,
        getConsoleLogs: () => [...consoleLogs], // Return copy of logs
        addConsoleLog: (message: string) => {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [TEST] ${message}`;
            consoleLogs.push(logMessage);
            console.log(logMessage);
        }
    };
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

// Helper to add custom test logs that will be included in the console log attachment
export function addTestLog(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [TEST] ${message}`;
    console.log(logMessage);
}

// Helper to get current test's console logs (useful for debugging)
export function getCurrentConsoleLogs(): string[] {
    // This would need to be called from within a test context where the hooks are available
    // For now, we'll just return an empty array as a placeholder
    return [];
}

// Enhanced console log filtering and categorization
export function filterConsoleLogs(logs: string[], options: {
    includeTypes?: string[];
    excludeTypes?: string[];
    includePatterns?: RegExp[];
    excludePatterns?: RegExp[];
    timeRange?: { start?: Date; end?: Date };
} = {}): string[] {
    return logs.filter(log => {
        // Type filtering
        if (options.includeTypes) {
            const hasIncludedType = options.includeTypes.some(type => 
                log.includes(`[${type.toUpperCase()}]`)
            );
            if (!hasIncludedType) return false;
        }
        
        if (options.excludeTypes) {
            const hasExcludedType = options.excludeTypes.some(type => 
                log.includes(`[${type.toUpperCase()}]`)
            );
            if (hasExcludedType) return false;
        }
        
        // Pattern filtering
        if (options.includePatterns) {
            const matchesIncludePattern = options.includePatterns.some(pattern => 
                pattern.test(log)
            );
            if (!matchesIncludePattern) return false;
        }
        
        if (options.excludePatterns) {
            const matchesExcludePattern = options.excludePatterns.some(pattern => 
                pattern.test(log)
            );
            if (matchesExcludePattern) return false;
        }
        
        // Time range filtering (basic implementation)
        if (options.timeRange) {
            const timestampMatch = log.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
            if (timestampMatch) {
                const logTime = new Date(timestampMatch[1]);
                if (options.timeRange.start && logTime < options.timeRange.start) return false;
                if (options.timeRange.end && logTime > options.timeRange.end) return false;
            }
        }
        
        return true;
    });
}

// Helper to create categorized log attachments
export async function attachCategorizedLogs(logs: string[]): Promise<void> {
    // All logs
    await allure.attachment('All Console Logs', logs.join('\n'), 'text/plain');
    
    // Error logs (both browser and Node.js)
    const errorLogs = filterConsoleLogs(logs, { includeTypes: ['error', 'node_error'] });
    if (errorLogs.length > 0) {
        await allure.attachment('Error Logs', errorLogs.join('\n'), 'text/plain');
    }
    
    // Warning logs (both browser and Node.js)
    const warningLogs = filterConsoleLogs(logs, { includeTypes: ['warning', 'node_warn'] });
    if (warningLogs.length > 0) {
        await allure.attachment('Warning Logs', warningLogs.join('\n'), 'text/plain');
    }
    
    // Browser logs only (from the page)
    const browserLogs = filterConsoleLogs(logs, { includeTypes: ['log', 'info', 'warning', 'error'] });
    if (browserLogs.length > 0) {
        await allure.attachment('Browser Console Logs', browserLogs.join('\n'), 'text/plain');
    }
    
    // Node.js logs only (from test execution)
    const nodeLogs = filterConsoleLogs(logs, { includeTypes: ['node_log', 'node_info', 'node_warn', 'node_error'] });
    if (nodeLogs.length > 0) {
        await allure.attachment('Node.js Console Logs', nodeLogs.join('\n'), 'text/plain');
    }
    
    // Application logs (filtering out test framework noise)
    const appLogs = filterConsoleLogs(logs, { 
        excludePatterns: [
            /page\.waitForSelector/,
            /waitForCustomEvent/,
            /React DevTools/,
            /Failed to take screenshot/
        ]
    });
    if (appLogs.length > 0) {
        await allure.attachment('Application Logs', appLogs.join('\n'), 'text/plain');
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
                await playwrightExpect(elementHandle)[name](...args);
                return { pass: true, message: () => '' };
            } catch (e) {
                return { pass: false, message: () => (e as Error).message || String(e) };
            }
        }
    ])
);

expect.extend(matchers);
import { allure } from 'jest-allure2-reporter/api';

// Store original console methods
const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
};

// Buffer to collect console messages during test execution
let consoleBuffer = [];
let currentTestName = '';

// Override console methods to capture logs and create attachments
console.log = (...args) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [LOG] ${message}`;
    
    // Call original console.log
    originalConsole.log(...args);
    
    // Add to buffer
    consoleBuffer.push(logEntry);
    
    // Create immediate attachment for this log
    try {
        allure.attachment(`Console Log - ${timestamp}`, logEntry, 'text/plain');
    } catch (error) {
        // Silently fail if allure is not available
    }
};

console.info = (...args) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [INFO] ${message}`;
    
    originalConsole.info(...args);
    consoleBuffer.push(logEntry);
    
    try {
        allure.attachment(`Console Info - ${timestamp}`, logEntry, 'text/plain');
    } catch (error) {
        // Silently fail if allure is not available
    }
};

console.warn = (...args) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [WARN] ${message}`;
    
    originalConsole.warn(...args);
    consoleBuffer.push(logEntry);
    
    try {
        allure.attachment(`Console Warning - ${timestamp}`, logEntry, 'text/plain');
    } catch (error) {
        // Silently fail if allure is not available
    }
};

console.error = (...args) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [ERROR] ${message}`;
    
    originalConsole.error(...args);
    consoleBuffer.push(logEntry);
    
    try {
        allure.attachment(`Console Error - ${timestamp}`, logEntry, 'text/plain');
    } catch (error) {
        // Silently fail if allure is not available
    }
};

// Reset buffer before each test
beforeEach(() => {
    consoleBuffer = [];
    currentTestName = expect.getState().currentTestName || 'Unknown Test';
});

// Create a summary attachment after each test
afterEach(async () => {
    if (consoleBuffer.length > 0) {
        try {
            const summary = consoleBuffer.join('\n');
            await allure.attachment(`${currentTestName} - All Console Logs`, summary, 'text/plain');
            
            // Create filtered attachments
            const errorLogs = consoleBuffer.filter(log => log.includes('[ERROR]'));
            if (errorLogs.length > 0) {
                await allure.attachment(`${currentTestName} - Error Logs`, errorLogs.join('\n'), 'text/plain');
            }
            
            const warnLogs = consoleBuffer.filter(log => log.includes('[WARN]'));
            if (warnLogs.length > 0) {
                await allure.attachment(`${currentTestName} - Warning Logs`, warnLogs.join('\n'), 'text/plain');
            }
        } catch (error) {
            // Silently fail if allure is not available
        }
    }
});

// Export original console methods in case they're needed
export { originalConsole };
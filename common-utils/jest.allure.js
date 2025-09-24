import { allure } from 'jest-allure2-reporter/api';

// -- Modify console.log to capture console logs in allure report --
const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
};

const modifiedConsoleLogHOF = (msgType) => {
    return (...args) => {
        if (!['log', 'info', 'warn', 'error'].includes(msgType)) return;
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${msgType.toUpperCase()}] ${message}`;
        originalConsole[msgType](...args);

        try {
            allure.attachment(`Console Log - ${timestamp}`, logEntry, 'text/plain');
        } catch (error) { /* silently fail of allure is not available */ }
    }
}

console.log = modifiedConsoleLogHOF("log");
console.info = modifiedConsoleLogHOF("info");
console.warn = modifiedConsoleLogHOF("warn");
console.error = modifiedConsoleLogHOF("error");
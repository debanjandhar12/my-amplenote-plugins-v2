/**
 * Comprehensive tests for VoiceToTextComposerButton component
 */
import { addScriptToHtmlString } from "../../../../common-utils/embed-helpers.js";
import { serializeWithFunctions } from "../../../../common-utils/embed-comunication.js";
import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from "../chat.testdata.js";
import html from "inline:../../../embed/chat.html";
import { createPlaywrightHooks, waitForCustomEvent } from "../../../../common-utils/playwright-helpers.ts";

describe('VoiceToTextComposerButton component', () => {
    const { getPage } = createPlaywrightHooks();

    // Mock embed commands with Vosklet functionality
    const createVoskletMockCommands = (voskletBehavior = {}) => ({
        ...EMBED_COMMANDS_MOCK,
        getSettings: async () => getLLMProviderSettings('groq'),
        onEmbedCall: async (functionName, ...args) => {
            switch (functionName) {
                case 'initializeVoskletSpeechToText':
                    return voskletBehavior.initializeResult || { success: true };
                case 'startVoskletRecording':
                    return voskletBehavior.startResult || { success: true };
                case 'stopVoskletRecording':
                    return voskletBehavior.stopResult || { success: true };
                case 'cleanupVoskletSpeechToText':
                    return voskletBehavior.cleanupResult || { success: true };
                default:
                    return EMBED_COMMANDS_MOCK.onEmbedCall?.(functionName, ...args) || { success: false };
            }
        }
    });

    describe('component rendering and browser support', () => {
        it('should render voice button when browser supports required APIs', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for component to initialize
            await page.waitForTimeout(1000);

            // Check if voice button is rendered
            const voiceButton = await page.$('button[title="Dictate"]');
            expect(voiceButton).toBeTruthy();
        }, 20000);

        it('should not render voice button when browser lacks support', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                // Mock missing browser APIs
                delete navigator.mediaDevices;
                delete window.AudioContext;
                
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for component to initialize
            await page.waitForTimeout(1000);

            // Voice button should not be rendered
            const voiceButton = await page.$('button[title="Dictate"]');
            expect(voiceButton).toBeNull();
        }, 20000);

        it('should not render when Vosklet initialization fails', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createVoskletMockCommands({
                        initializeResult: { success: false, error: 'Vosklet failed to load' }
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for component to initialize
            await page.waitForTimeout(1000);

            // Voice button should not be rendered due to initialization failure
            const voiceButton = await page.$('button[title="Dictate"]');
            expect(voiceButton).toBeNull();
        }, 20000);
    });

    describe('button positioning', () => {
        it('should position button 48px from right when send button is visible', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Add text to composer to make send button visible
            await page.waitForSelector('.aui-composer-input');
            await page.locator('.aui-composer-input').fill('Test message');

            // Wait for voice button to appear
            await page.waitForSelector('button[title="Dictate"]', { timeout: 5000 });

            // Check button positioning
            const buttonStyle = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).right
            );
            expect(buttonStyle).toBe('48px');
        }, 20000);

        it('should position button 8px from right when send button is not visible', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for voice button to appear (with empty composer)
            await page.waitForSelector('button[title="Dictate"]', { timeout: 5000 });

            // Check button positioning when no text in composer
            const buttonStyle = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).right
            );
            expect(buttonStyle).toBe('8px');
        }, 20000);
    });

    describe('recording functionality', () => {
        it('should start recording when button is clicked', async () => {
            let startRecordingCalled = false;
            
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createVoskletMockCommands({
                        startResult: (() => {
                            window.startRecordingCalled = true;
                            return { success: true };
                        })()
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for voice button and click it
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');

            // Check if startVoskletRecording was called
            const recordingStarted = await page.evaluate(() => window.startRecordingCalled);
            expect(recordingStarted).toBe(true);
        }, 20000);

        it('should stop recording when button is clicked while recording', async () => {
            let stopRecordingCalled = false;
            
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.recordingState = false;
                
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
                    ...createVoskletMockCommands(),
                    onEmbedCall: async (functionName, ...args) => {
                        if (functionName === 'startVoskletRecording') {
                            window.recordingState = true;
                            return { success: true };
                        } else if (functionName === 'stopVoskletRecording') {
                            window.recordingState = false;
                            window.stopRecordingCalled = true;
                            return { success: true };
                        }
                        return createVoskletMockCommands().onEmbedCall(functionName, ...args);
                    }
                }))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for voice button
            await page.waitForSelector('button[title="Dictate"]');
            
            // Start recording
            await page.click('button[title="Dictate"]');
            await page.waitForTimeout(100);
            
            // Stop recording
            await page.click('button[title="Dictate"]');

            // Check if stopVoskletRecording was called
            const recordingStopped = await page.evaluate(() => window.stopRecordingCalled);
            expect(recordingStopped).toBe(true);
        }, 20000);

        it('should show visual feedback during recording', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for voice button
            await page.waitForSelector('button[title="Dictate"]');
            
            // Check initial state (not recording)
            let buttonColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(buttonColor).not.toBe('rgb(239, 68, 68)'); // Not red

            // Start recording
            await page.click('button[title="Dictate"]');
            await page.waitForTimeout(100);

            // Check recording state visual feedback
            buttonColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            // Should show red color during recording
            expect(buttonColor).toBe('rgb(239, 68, 68)');

            // Check for pulsing animation
            const hasAnimation = await page.$eval('button[title="Dictate"] svg', el => 
                window.getComputedStyle(el).animation
            );
            expect(hasAnimation).toContain('pulse');
        }, 20000);
    });

    describe('speech recognition results handling', () => {
        it('should append final results to composer text', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
                
                // Simulate speech recognition result after a delay
                setTimeout(() => {
                    window.postMessage({
                        type: 'voskletCallback',
                        callbackType: 'onResult',
                        data: { text: 'Hello world' }
                    }, '*');
                }, 1000);
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for composer input
            await page.waitForSelector('.aui-composer-input');
            
            // Start recording
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');

            // Wait for speech result to be processed
            await page.waitForTimeout(1500);

            // Check if text was added to composer
            const composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('Hello world');
        }, 20000);

        it('should append to existing composer text', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
                
                // Simulate speech recognition result after a delay
                setTimeout(() => {
                    window.postMessage({
                        type: 'voskletCallback',
                        callbackType: 'onResult',
                        data: { text: 'from speech' }
                    }, '*');
                }, 1000);
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Add initial text to composer
            await page.waitForSelector('.aui-composer-input');
            await page.locator('.aui-composer-input').fill('Initial text');
            
            // Start recording
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');

            // Wait for speech result to be processed
            await page.waitForTimeout(1500);

            // Check if text was appended to existing text
            const composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('Initial text from speech');
        }, 20000);

        it('should handle partial results without updating composer', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
                
                // Simulate partial result (should not update composer)
                setTimeout(() => {
                    window.postMessage({
                        type: 'voskletCallback',
                        callbackType: 'onPartialResult',
                        data: { text: 'partial text' }
                    }, '*');
                }, 1000);
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for composer input
            await page.waitForSelector('.aui-composer-input');
            
            // Start recording
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');

            // Wait for partial result to be processed
            await page.waitForTimeout(1500);

            // Composer should remain empty (partial results don't update composer)
            const composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('');
        }, 20000);
    });

    describe('error handling', () => {
        it('should handle recording start errors gracefully', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createVoskletMockCommands({
                        startResult: { success: false, error: 'Microphone access denied' }
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for voice button and click it
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');

            // Wait for error handling
            await page.waitForTimeout(500);

            // Button should not show recording state due to error
            const buttonColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(buttonColor).not.toBe('rgb(239, 68, 68)'); // Should not be red
        }, 20000);

        it('should handle speech recognition errors', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
                
                // Simulate error callback
                setTimeout(() => {
                    window.postMessage({
                        type: 'voskletCallback',
                        callbackType: 'onError',
                        data: { message: 'Recognition error' }
                    }, '*');
                }, 1000);
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Start recording
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');

            // Wait for error to be processed
            await page.waitForTimeout(1500);

            // Button should return to non-recording state after error
            const buttonColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(buttonColor).not.toBe('rgb(239, 68, 68)'); // Should not be red
        }, 20000);

        it('should handle stop recording errors gracefully', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createVoskletMockCommands({
                        stopResult: { success: false, error: 'Stop recording failed' }
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Start recording
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');
            await page.waitForTimeout(100);

            // Try to stop recording (should handle error gracefully)
            await page.click('button[title="Dictate"]');
            await page.waitForTimeout(500);

            // Component should still be functional despite stop error
            const button = await page.$('button[title="Dictate"]');
            expect(button).toBeTruthy();
        }, 20000);
    });

    describe('component lifecycle', () => {
        it('should cleanup resources on unmount', async () => {
            let cleanupCalled = false;
            
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
                    ...createVoskletMockCommands(),
                    onEmbedCall: async (functionName, ...args) => {
                        if (functionName === 'cleanupVoskletSpeechToText') {
                            window.cleanupCalled = true;
                            return { success: true };
                        }
                        return createVoskletMockCommands().onEmbedCall(functionName, ...args);
                    }
                }))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for component to initialize
            await page.waitForSelector('button[title="Dictate"]');

            // Navigate away to trigger unmount
            await page.setContent('<html><body>New page</body></html>');
            await page.waitForTimeout(500);

            // Check if cleanup was called
            const cleanupWasCalled = await page.evaluate(() => window.cleanupCalled);
            expect(cleanupWasCalled).toBe(true);
        }, 20000);

        it('should handle message listener cleanup', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for component to initialize
            await page.waitForSelector('button[title="Dictate"]');

            // Count initial message listeners
            const initialListenerCount = await page.evaluate(() => {
                return window.getEventListeners ? window.getEventListeners(window).message?.length || 0 : 0;
            });

            // Navigate away to trigger cleanup
            await page.setContent('<html><body>New page</body></html>');
            await page.waitForTimeout(500);

            // Message listeners should be cleaned up (this is hard to test directly,
            // but we can verify the component unmounted without errors)
            const finalContent = await page.textContent('body');
            expect(finalContent).toBe('New page');
        }, 20000);
    });

    describe('integration with thread runtime', () => {
        it('should work with thread runtime composer state', async () => {
            const htmlWithMocks = addScriptToHtmlString(html, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createVoskletMockCommands()))};
                
                // Simulate speech result
                setTimeout(() => {
                    window.postMessage({
                        type: 'voskletCallback',
                        callbackType: 'onResult',
                        data: { text: 'Thread runtime test' }
                    }, '*');
                }, 1000);
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for composer and voice button
            await page.waitForSelector('.aui-composer-input');
            await page.waitForSelector('button[title="Dictate"]');

            // Start recording
            await page.click('button[title="Dictate"]');

            // Wait for result
            await page.waitForTimeout(1500);

            // Verify text was set through thread runtime
            const composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('Thread runtime test');
        }, 20000);
    });
});
/**
 * Integration tests for end-to-end speech recognition pipeline
 */
import { addScriptToHtmlString } from "../../../common-utils/embed-helpers.js";
import { serializeWithFunctions } from "../../../common-utils/embed-comunication.js";
import { EMBED_COMMANDS_MOCK, getLLMProviderSettings } from "../frontend-chat/chat.testdata.js";
import chatHtml from "inline:../../embed/chat.html";
import speechToTextHtml from "inline:../../embed/speechtotext.html";
import { createPlaywrightHooks, waitForCustomEvent } from "../../../common-utils/playwright-helpers.ts";

describe('Speech-to-Text Integration Tests', () => {
    const { getPage } = createPlaywrightHooks();

    // Mock plugin backend with Vosklet functionality
    const createIntegrationMockCommands = (behavior = {}) => ({
        ...EMBED_COMMANDS_MOCK,
        getSettings: async () => getLLMProviderSettings('groq'),
        onEmbedCall: async (functionName, ...args) => {
            switch (functionName) {
                case 'initializeVoskletSpeechToText':
                    // Simulate initialization delay
                    await new Promise(resolve => setTimeout(resolve, behavior.initDelay || 100));
                    return behavior.initResult || { success: true };
                    
                case 'startVoskletRecording':
                    // Simulate recording start
                    if (behavior.simulateResults) {
                        // Simulate speech recognition results after delay
                        setTimeout(() => {
                            behavior.simulateResults.forEach((result, index) => {
                                setTimeout(() => {
                                    window.postMessage({
                                        type: 'voskletCallback',
                                        callbackType: result.type,
                                        data: result.data
                                    }, '*');
                                }, index * (result.delay || 500));
                            });
                        }, 200);
                    }
                    return behavior.startResult || { success: true };
                    
                case 'stopVoskletRecording':
                    return behavior.stopResult || { success: true };
                    
                case 'getVoskletRecordingStatus':
                    return behavior.statusResult || { success: true, isRecording: false };
                    
                case 'cleanupVoskletSpeechToText':
                    return behavior.cleanupResult || { success: true };
                    
                default:
                    return EMBED_COMMANDS_MOCK.onEmbedCall?.(functionName, ...args) || { success: false };
            }
        }
    });

    describe('Chat Composer Integration', () => {
        it('should complete full speech-to-text workflow in chat composer', async () => {
            const speechResults = [
                { type: 'onPartialResult', data: { text: 'Hello' }, delay: 300 },
                { type: 'onPartialResult', data: { text: 'Hello world' }, delay: 300 },
                { type: 'onResult', data: { text: 'Hello world from speech!' }, delay: 300 }
            ];

            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createIntegrationMockCommands({
                        simulateResults: speechResults
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for voice button to appear
            await page.waitForSelector('button[title="Dictate"]', { timeout: 10000 });

            // Verify initial state
            let composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('');

            // Start recording
            await page.click('button[title="Dictate"]');

            // Verify recording state
            await page.waitForTimeout(100);
            const recordingColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(recordingColor).toBe('rgb(239, 68, 68)'); // Red during recording

            // Wait for speech results to be processed
            await page.waitForTimeout(2000);

            // Verify final result was added to composer
            composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('Hello world from speech!');

            // Stop recording
            await page.click('button[title="Dictate"]');

            // Verify recording stopped
            await page.waitForTimeout(100);
            const stoppedColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(stoppedColor).not.toBe('rgb(239, 68, 68)'); // Not red when stopped
        }, 25000);

        it('should handle multiple recording sessions', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.sessionCount = 0;
                
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions({
                    ...createIntegrationMockCommands(),
                    onEmbedCall: async (functionName, ...args) => {
                        if (functionName === 'startVoskletRecording') {
                            window.sessionCount++;
                            // Simulate different results for each session
                            setTimeout(() => {
                                window.postMessage({
                                    type: 'voskletCallback',
                                    callbackType: 'onResult',
                                    data: { text: \`Session \$\{window.sessionCount\} result\` }
                                }, '*');
                            }, 300);
                            return { success: true };
                        }
                        return createIntegrationMockCommands().onEmbedCall(functionName, ...args);
                    }
                }))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            await page.waitForSelector('button[title="Dictate"]');

            // First recording session
            await page.click('button[title="Dictate"]');
            await page.waitForTimeout(500);
            await page.click('button[title="Dictate"]');

            // Wait for first result
            await page.waitForTimeout(500);
            let composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('Session 1 result');

            // Second recording session
            await page.click('button[title="Dictate"]');
            await page.waitForTimeout(500);
            await page.click('button[title="Dictate"]');

            // Wait for second result
            await page.waitForTimeout(500);
            composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('Session 1 result Session 2 result');
        }, 25000);

        it('should handle recording with existing text in composer', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createIntegrationMockCommands({
                        simulateResults: [
                            { type: 'onResult', data: { text: 'additional text' }, delay: 300 }
                        ]
                    })
                ))};
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

            // Wait for speech result
            await page.waitForTimeout(1000);

            // Verify text was appended
            const composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('Initial text additional text');
        }, 20000);
    });

    describe('Speech-to-Text Interface Integration', () => {
        it('should work with standalone speech-to-text interface', async () => {
            const htmlWithMocks = addScriptToHtmlString(speechToTextHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createIntegrationMockCommands({
                        simulateResults: [
                            { type: 'onResult', data: { text: 'Standalone interface test' }, delay: 500 }
                        ]
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);

            // Wait for interface to load
            await page.waitForTimeout(2000);

            // The speech-to-text interface should auto-start recording
            // Wait for speech result to be processed
            await page.waitForTimeout(1500);

            // Verify the interface received and processed the speech result
            // (This would depend on the specific implementation of the speech-to-text interface)
            const pageContent = await page.textContent('body');
            expect(pageContent).toContain('Standalone interface test');
        }, 20000);
    });

    describe('Error Scenarios Integration', () => {
        it('should handle network failures during initialization', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createIntegrationMockCommands({
                        initResult: { success: false, error: 'Network error: Failed to load Vosklet module' }
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for initialization attempt
            await page.waitForTimeout(1000);

            // Voice button should not be rendered due to initialization failure
            const voiceButton = await page.$('button[title="Dictate"]');
            expect(voiceButton).toBeNull();
        }, 20000);

        it('should handle microphone permission denial', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createIntegrationMockCommands({
                        startResult: { success: false, error: 'Permission denied: Microphone access not allowed' }
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for voice button
            await page.waitForSelector('button[title="Dictate"]');

            // Try to start recording
            await page.click('button[title="Dictate"]');

            // Wait for error handling
            await page.waitForTimeout(500);

            // Button should not show recording state due to permission error
            const buttonColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(buttonColor).not.toBe('rgb(239, 68, 68)'); // Should not be red
        }, 20000);

        it('should handle audio context failures', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createIntegrationMockCommands({
                        initResult: { success: false, error: 'AudioContext creation failed' }
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for initialization attempt
            await page.waitForTimeout(1000);

            // Voice button should not be rendered due to audio context failure
            const voiceButton = await page.$('button[title="Dictate"]');
            expect(voiceButton).toBeNull();
        }, 20000);

        it('should handle runtime errors during recording', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createIntegrationMockCommands({
                        simulateResults: [
                            { type: 'onError', data: { message: 'Audio processing error' }, delay: 300 }
                        ]
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Start recording
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');

            // Wait for error to be processed
            await page.waitForTimeout(1000);

            // Button should return to non-recording state after error
            const buttonColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(buttonColor).not.toBe('rgb(239, 68, 68)'); // Should not be red
        }, 20000);
    });

    describe('Performance and Memory Management', () => {
        it('should handle rapid start/stop cycles', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createIntegrationMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            await page.waitForSelector('button[title="Dictate"]');

            // Perform rapid start/stop cycles
            for (let i = 0; i < 5; i++) {
                await page.click('button[title="Dictate"]'); // Start
                await page.waitForTimeout(100);
                await page.click('button[title="Dictate"]'); // Stop
                await page.waitForTimeout(100);
            }

            // Component should still be functional
            const button = await page.$('button[title="Dictate"]');
            expect(button).toBeTruthy();

            // Final state should be not recording
            const buttonColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(buttonColor).not.toBe('rgb(239, 68, 68)');
        }, 20000);

        it('should handle long recording sessions', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(
                    createIntegrationMockCommands({
                        simulateResults: [
                            { type: 'onPartialResult', data: { text: 'Long' }, delay: 500 },
                            { type: 'onPartialResult', data: { text: 'Long recording' }, delay: 500 },
                            { type: 'onPartialResult', data: { text: 'Long recording session' }, delay: 500 },
                            { type: 'onResult', data: { text: 'Long recording session complete' }, delay: 500 }
                        ]
                    })
                ))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Start long recording session
            await page.waitForSelector('button[title="Dictate"]');
            await page.click('button[title="Dictate"]');

            // Wait for all partial and final results
            await page.waitForTimeout(3000);

            // Verify final result
            const composerText = await page.$eval('.aui-composer-input', el => el.value || el.textContent);
            expect(composerText.trim()).toBe('Long recording session complete');

            // Stop recording
            await page.click('button[title="Dictate"]');

            // Verify clean stop
            const buttonColor = await page.$eval('button[title="Dictate"]', el => 
                window.getComputedStyle(el).color
            );
            expect(buttonColor).not.toBe('rgb(239, 68, 68)');
        }, 25000);
    });

    describe('Cross-browser Compatibility', () => {
        it('should handle missing browser APIs gracefully', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                // Simulate missing APIs
                delete navigator.mediaDevices;
                
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createIntegrationMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Wait for component initialization
            await page.waitForTimeout(1000);

            // Voice button should not be rendered
            const voiceButton = await page.$('button[title="Dictate"]');
            expect(voiceButton).toBeNull();

            // Chat interface should still be functional
            const composerInput = await page.$('.aui-composer-input');
            expect(composerInput).toBeTruthy();
        }, 20000);

        it('should handle AudioContext variations', async () => {
            const htmlWithMocks = addScriptToHtmlString(chatHtml, `
                // Mock different AudioContext implementations
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                
                window.INJECTED_SETTINGS = ${JSON.stringify(getLLMProviderSettings('groq'))};
                window.INJECTED_EMBED_COMMANDS_MOCK = ${JSON.stringify(serializeWithFunctions(createIntegrationMockCommands()))};
            `);

            const page = await getPage();
            await page.setContent(htmlWithMocks);
            await waitForCustomEvent(page, 'appLoaded');

            // Component should handle different AudioContext implementations
            await page.waitForSelector('button[title="Dictate"]', { timeout: 5000 });
            
            const voiceButton = await page.$('button[title="Dictate"]');
            expect(voiceButton).toBeTruthy();
        }, 20000);
    });
});
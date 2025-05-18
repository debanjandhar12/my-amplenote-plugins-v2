import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

export async function handleSpeechToText(app, plugin) {
    try {
        await app.context.replaceSelection(`Loading...`);
        app.openSidebarEmbed(1, {openSpeechToText: true});
        while (!(await plugin.isEmbedOpen(app))) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        const pipeline = (await dynamicImportESM('@huggingface/transformers')).pipeline;
        const speechPipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
            dtype: 'q8',
            device: 'wasm'
        });
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioContext = new AudioContext({ sampleRate: 16_000 });

        await plugin.sendMessageToEmbed(app, 'speechtotext', 'ready');
        let i = 0, transcribeResult = '', audioChunks = [], processing = false;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                processAudioChunks();
            }
            console.log('MediaRecorder data available.', event.data.size);
        }

        mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped.');
            processAudioChunks(); // Process any remaining audio chunks
        }

        const processAudioChunks = async () => {
            if (audioChunks.length === 0) return;
            while (processing) {
                console.log('awaiting lock');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            processing = true;
            const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
            console.log('audioChunks', audioChunks);
            const fileReader = new FileReader();
            fileReader.onloadend = async () => {
                try {
                    const arrayBuffer = fileReader.result;
                    const decoded = await audioContext.decodeAudioData(arrayBuffer);
                    let audio = decoded.getChannelData(0);
                    const MAX_SAMPLES = 16_000 * 30;    // 30 seconds * 16,000 samples per second is limit
                    if (audio.length > MAX_SAMPLES) { // Get first MAX_SAMPLES
                        audio = audio.slice(0, MAX_SAMPLES);
                    }
                    const result = await transcribe(speechPipe, audio);
                    transcribeResult += result.text;
                    console.log('transcribeResult', transcribeResult, 'result.text', result.text);
                } catch (e) {console.error(e);}
                // audioChunks = []; - fails to decode otherwise
                processing = false;
            }
            fileReader.readAsArrayBuffer(blob);
        }

        mediaRecorder.start(5000);

        console.log('Speech to Text app is processing');
        while ((await plugin.isEmbedOpen(app))|| processing === true) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await app.context.replaceSelection(transcribeResult.trim() === '' ?
                'Say something...' : transcribeResult.trim());
            i++;
        }

        if (mediaRecorder.state === "recording" || mediaRecorder.state === "paused") {
            mediaRecorder.stop();
        }
    } catch (e) {
        try {   // Reset selection
            await app.context.replaceSelection('');
        } catch (e) {}
        await plugin.sendMessageToEmbed(app, 'speechtotext', e);
        throw e;
    }
}

function transcribe(speechPipe, audio) {
    return speechPipe(audio);
}
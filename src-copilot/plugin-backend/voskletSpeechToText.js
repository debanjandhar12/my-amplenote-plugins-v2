import dynamicImportESM from '../../common-utils/dynamic-import-esm.js';

export class VoskletSpeechToText {
  constructor(options = {}) {
    this.options = {
      modelUrl: "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz",
      modelName: "vosk-model-small-en-us-0.15",
      language: "English",
      bufferSize: 4096,
      sampleRate: 16000,
      ...options
    };
    
    this._resetState();
  }

  _resetState() {
    this.voskModule = null;
    this.model = null;
    this.recognizer = null;
    this.audioContext = null;
    this.micNode = null;
    this.recognizerNode = null;
    this.mediaStream = null;
    this.isInitialized = false;
    this.isRecordingActive = false;
    this.callbacks = {};
  }

  async _loadVoskModule() {
    try {
      const module = await dynamicImportESM('vosk-browser');
      console.log('Vosk module methods:', Object.keys(module));
      console.log('Vosk module:', module);
      return module;
    } catch (error) {
      throw new Error(`Failed to load vosk-browser module: ${error.message}`);
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.voskModule = await this._loadVoskModule();
      
      this.audioContext = new AudioContext({
        sampleRate: this.options.sampleRate,
        ...(AudioContext.prototype.setSinkId ? { sinkId: { type: "none" } } : {})
      });

      this.model = await this.voskModule.createModel(this.options.modelUrl);
      this.isInitialized = true;
      
      this.callbacks.onReady?.();
    } catch (error) {
      const initError = new Error(`Failed to initialize VoskletSpeechToText: ${error.message}`);
      initError.type = this._getErrorType(error);
      
      this.callbacks.onError?.(initError);
      throw initError;
    }
  }

  async startRecording(callbacks = {}) {
    if (!this.isInitialized) {
      throw new Error('VoskletSpeechToText not initialized. Call initialize() first.');
    }

    if (this.isRecordingActive) {
      throw new Error('Recording is already active');
    }

    this.callbacks = callbacks;

    try {
      await this._setupAudioPipeline();
      this.isRecordingActive = true;
    } catch (error) {
      const recordingError = new Error(`Failed to start recording: ${error.message}`);
      recordingError.type = this._getErrorType(error);
      
      await this._cleanupRecording();
      this.callbacks.onError?.(recordingError);
      throw recordingError;
    }
  }

  async _setupAudioPipeline() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
        autoGainControl: false,
        sampleRate: this.options.sampleRate
      }
    });

    this.recognizer = new this.model.KaldiRecognizer(this.options.sampleRate);

    this.recognizer.on("result", (message) => {
      if (this.callbacks.onResult && message.result?.text) {
        this.callbacks.onResult(message.result.text);
      }
    });

    this.recognizer.on("partialresult", (message) => {
      if (this.callbacks.onPartialResult && message.result?.partial) {
        this.callbacks.onPartialResult(message.result.partial);
      }
    });

    this.micNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.recognizerNode = this.audioContext.createScriptProcessor(
      this.options.bufferSize, 
      1, 
      1
    );

    this.recognizerNode.onaudioprocess = (event) => {
      try {
        if (this.recognizer && this.isRecordingActive) {
          this.recognizer.acceptWaveform(event.inputBuffer);
        }
      } catch (error) {
        console.error('Audio processing failed:', error);
        const processingError = new Error(`Audio processing failed: ${error.message}`);
        processingError.type = 'AUDIO_PROCESSING_ERROR';
        this.callbacks.onError?.(processingError);
      }
    };

    this.micNode.connect(this.recognizerNode);
    this.recognizerNode.connect(this.audioContext.destination);
  }

  async stopRecording() {
    if (!this.isRecordingActive) return;

    try {
      await this._cleanupRecording();
      this.isRecordingActive = false;
    } catch (error) {
      const stopError = new Error(`Error stopping recording: ${error.message}`);
      stopError.type = 'CLEANUP_ERROR';
      this.callbacks.onError?.(stopError);
      throw stopError;
    }
  }

  isRecording() {
    return this.isRecordingActive;
  }

  async cleanup() {
    try {
      await this.stopRecording();
      
      if (this.audioContext?.state !== 'closed') {
        await this.audioContext.close();
      }
      
      this._resetState();
    } catch (error) {
      const cleanupError = new Error(`Error during cleanup: ${error.message}`);
      cleanupError.type = 'CLEANUP_ERROR';
      throw cleanupError;
    }
  }

  async _cleanupRecording() {
    try {
      if (this.micNode) {
        this.micNode.disconnect();
        this.micNode = null;
      }

      if (this.recognizerNode) {
        this.recognizerNode.disconnect();
        this.recognizerNode.onaudioprocess = null;
        this.recognizerNode = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      this.recognizer = null;
    } catch (error) {
      console.error('Error during recording cleanup:', error);
    }
  }

  _getErrorType(error) {
    const errorMap = {
      'NotAllowedError': 'PERMISSION_ERROR',
      'PermissionDeniedError': 'PERMISSION_ERROR',
      'NetworkError': 'NETWORK_ERROR',
      'NotSupportedError': 'BROWSER_SUPPORT_ERROR'
    };

    if (errorMap[error.name]) return errorMap[error.name];
    if (error.message.includes('fetch')) return 'NETWORK_ERROR';
    if (error.message.includes('AudioContext')) return 'AUDIO_CONTEXT_ERROR';
    if (error.message.includes('vosk-browser')) return 'VOSK_MODULE_ERROR';
    return 'UNKNOWN_ERROR';
  }
}

let voskletInstance = null;

export function getVoskletInstance(options = {}) {
  if (!voskletInstance) {
    voskletInstance = new VoskletSpeechToText(options);
  }
  return voskletInstance;
}

export function resetVoskletInstance() {
  if (voskletInstance) {
    voskletInstance.cleanup().catch(console.error);
    voskletInstance = null;
  }
}
import dynamicImportESM from '../../common-utils/dynamic-import-esm.js';

/**
 * Unified VoskletSpeechToText API class
 * Provides consistent speech-to-text functionality using vosk-browser engine
 */
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
    
    // Internal state
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

  /**
   * Load vosk-browser module
   * @private
   * @returns {Promise<any>}
   */
  async _loadVoskModule() {
    try {
      const module = await dynamicImportESM('vosk-browser');
      
      // Debug: Log available methods to understand the API
      console.log('Vosk module methods:', Object.keys(module));
      console.log('Vosk module:', module);
      
      return module;
    } catch (error) {
      throw new Error(`Failed to load vosk-browser module: ${error.message}`);
    }
  }

  /**
   * Initialize the vosk-browser speech recognition system
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

      // Load vosk-browser module
      this.voskModule = await this._loadVoskModule();
      
      // Create audio context with optimal configuration
      try {
        this.audioContext = new AudioContext({
          sampleRate: this.options.sampleRate,
          sinkId: { type: "none" }
        });
      } catch (e) {
        // Fallback if sinkId option is unsupported
        this.audioContext = new AudioContext({
          sampleRate: this.options.sampleRate
        });
      }

      this.model = await this.voskModule.createModel(this.options.modelUrl);
      this.isInitialized = true;
      
      if (this.callbacks.onReady) {
        this.callbacks.onReady();
      }
    } catch (error) {
      const initError = new Error(`Failed to initialize VoskletSpeechToText: ${error.message}`);
      initError.type = this._getErrorType(error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(initError);
      }
      throw initError;
    }
  }

  /**
   * Start recording audio and speech recognition
   * @param {Object} callbacks - Callback functions for events
   * @param {Function} callbacks.onPartialResult - Called with partial recognition results
   * @param {Function} callbacks.onResult - Called with final recognition results
   * @param {Function} callbacks.onError - Called when errors occur
   * @param {Function} callbacks.onReady - Called when system is ready
   * @returns {Promise<void>}
   */
  async startRecording(callbacks = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('VoskletSpeechToText not initialized. Call initialize() first.');
      }

      if (this.isRecordingActive) {
        throw new Error('Recording is already active');
      }

      this.callbacks = callbacks;

      // Request microphone access with optimal settings
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

      // Create recognizer
      this.recognizer = new this.model.KaldiRecognizer(this.options.sampleRate);

      // Set up event listeners for recognition results
        this.recognizer.on("result", (message) => {
            if (this.callbacks.onResult && message.result && message.result.text) {
                this.callbacks.onResult(message.result.text);
            }
        });

        this.recognizer.on("partialresult", (message) => {
            if (this.callbacks.onPartialResult && message.result && message.result.partial) {
                this.callbacks.onPartialResult(message.result.partial);
            }
        });

      // Create microphone input node
      this.micNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor node for audio processing
      this.recognizerNode = this.audioContext.createScriptProcessor(
        this.options.bufferSize, 
        1, 
        1
      );

      // Set up audio processing
      this.recognizerNode.onaudioprocess = (event) => {
        try {
          if (this.recognizer && this.isRecordingActive) {
              this.recognizer.acceptWaveform(event.inputBuffer);
          }
        } catch (error) {
          console.error('Audio processing failed:', error);
          if (this.callbacks.onError) {
            const processingError = new Error(`Audio processing failed: ${error.message}`);
            processingError.type = 'AUDIO_PROCESSING_ERROR';
            this.callbacks.onError(processingError);
          }
        }
      };

      // Connect audio pipeline
      this.micNode.connect(this.recognizerNode);
      this.recognizerNode.connect(this.audioContext.destination);

      this.isRecordingActive = true;

    } catch (error) {
      const recordingError = new Error(`Failed to start recording: ${error.message}`);
      recordingError.type = this._getErrorType(error);
      
      // Cleanup on error
      await this._cleanupRecording();
      
      if (this.callbacks.onError) {
        this.callbacks.onError(recordingError);
      }
      throw recordingError;
    }
  }

  /**
   * Stop recording and cleanup audio resources
   * @returns {Promise<void>}
   */
  async stopRecording() {
    try {
      if (!this.isRecordingActive) {
        return;
      }

      await this._cleanupRecording();
      this.isRecordingActive = false;
      
    } catch (error) {
      const stopError = new Error(`Error stopping recording: ${error.message}`);
      stopError.type = 'CLEANUP_ERROR';
      
      if (this.callbacks.onError) {
        this.callbacks.onError(stopError);
      }
      throw stopError;
    }
  }

  /**
   * Check if recording is currently active
   * @returns {boolean}
   */
  isRecording() {
    return this.isRecordingActive;
  }

  /**
   * Complete cleanup of all resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      await this.stopRecording();
      
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
      
      // Reset all references
      this.voskModule = null;
      this.model = null;
      this.recognizer = null;
      this.audioContext = null;
      this.micNode = null;
      this.recognizerNode = null;
      this.mediaStream = null;
      this.isInitialized = false;
      this.callbacks = {};
      
    } catch (error) {
      const cleanupError = new Error(`Error during cleanup: ${error.message}`);
      cleanupError.type = 'CLEANUP_ERROR';
      throw cleanupError;
    }
  }

  /**
   * Internal method to cleanup recording resources
   * @private
   */
  async _cleanupRecording() {
    try {
      // Disconnect audio nodes
      if (this.micNode) {
        this.micNode.disconnect();
        this.micNode = null;
      }

      if (this.recognizerNode) {
        this.recognizerNode.disconnect();
        this.recognizerNode.onaudioprocess = null;
        this.recognizerNode = null;
      }

      // Stop media stream tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Cleanup recognizer event listeners
      if (this.recognizer) {
        // Remove all event listeners by creating a new recognizer instance
        // This is the safest way to ensure cleanup with vosk-browser
        this.recognizer = null;
      }
      
    } catch (error) {
      console.error('Error during recording cleanup:', error);
      // Don't throw here to allow cleanup to continue
    }
  }

  /**
   * Determine error type based on error characteristics
   * @private
   * @param {Error} error 
   * @returns {string}
   */
  _getErrorType(error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'PERMISSION_ERROR';
    }
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (error.name === 'NotSupportedError') {
      return 'BROWSER_SUPPORT_ERROR';
    }
    if (error.message.includes('AudioContext')) {
      return 'AUDIO_CONTEXT_ERROR';
    }
    if (error.message.includes('vosk-browser')) {
      return 'VOSK_MODULE_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }
}

// Export singleton instance for plugin use
let voskletInstance = null;

/**
 * Get or create singleton instance of VoskletSpeechToText
 * @param {Object} options - Configuration options
 * @returns {VoskletSpeechToText}
 */
export function getVoskletInstance(options = {}) {
  if (!voskletInstance) {
    voskletInstance = new VoskletSpeechToText(options);
  }
  return voskletInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetVoskletInstance() {
  if (voskletInstance) {
    voskletInstance.cleanup().catch(console.error);
    voskletInstance = null;
  }
}
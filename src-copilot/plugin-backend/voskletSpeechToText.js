/**
 * Unified VoskletSpeechToText API class
 * Provides consistent speech-to-text functionality using Vosklet WebAssembly engine
 */
export class VoskletSpeechToText {
  constructor(options = {}) {
    this.options = {
      modelUrl: "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz",
      modelName: "vosk-model-small-en-us-0.15",
      language: "English",
      bufferSize: 128 * 150,
      voskletLoader: null, // For dependency injection in tests
      ...options
    };
    
    // Internal state
    this.voskletModule = null;
    this.model = null;
    this.recognizer = null;
    this.audioContext = null;
    this.micNode = null;
    this.transferer = null;
    this.mediaStream = null;
    this.isInitialized = false;
    this.isRecordingActive = false;
    this.callbacks = {};
  }

  /**
   * Ensure Vosklet script is loaded and return its module via global loadVosklet()
   * @private
   * @returns {Promise<any>}
   */
  async _loadVoskletModule() {
    // If already available, use it
    if (typeof window !== 'undefined' && typeof window.loadVosklet === 'function') {
      return await window.loadVosklet();
    }

    const CORS_HACKY_FIX_COI = 'https://cdn.jsdelivr.net/gh/msqr1/Vosklet@1.2.1/AddCOI.js';
    const CDN_URL = 'https://cdn.jsdelivr.net/gh/msqr1/Vosklet@1.2.1/Examples/Vosklet.js';

    if (typeof document === 'undefined') {
      throw new Error('Vosklet script loader requires a browser environment');
    }

      // Inject the script only once
      let script2 = document.querySelector('script[data-vosklet-loader-coi="true"]');
      if (!script2) {
          script2 = document.createElement('script');
          script2.src = CORS_HACKY_FIX_COI;
          script2.async = true;
          script2.defer = true;
          script2.crossOrigin = 'anonymous';
          script2.setAttribute('data-vosklet-loader-coi', 'true');
          document.head.appendChild(script2);
      }

    // Inject the script only once
    let script = document.querySelector('script[data-vosklet-loader="true"]');
    if (!script) {
      script = document.createElement('script');
      script.src = CDN_URL;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-vosklet-loader', 'true');
      document.head.appendChild(script);
    }

    // Wait for the global loader to become available
    await new Promise((resolve, reject) => {
      if (typeof window.loadVosklet === 'function') {
        resolve();
        return;
      }

      const onLoad = () => resolve();
      const onError = () => reject(new Error('Failed to load Vosklet script'));
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });

      // Safety: resolve if the global appears within timeout even if no load event fires
      setTimeout(() => {
        if (typeof window.loadVosklet === 'function') {
          resolve();
        }
      }, 10000);
    });

    if (typeof window.loadVosklet !== 'function') {
      throw new Error('Vosklet global loader not available after script load');
    }

    return await window.loadVosklet();
  }

  /**
   * Initialize the Vosklet speech recognition system
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }
      // Load Vosklet module via injected loader or global loader provided by the Vosklet script
      if (this.options.voskletLoader) {
        this.voskletModule = await this.options.voskletLoader();
      } else {
        this.voskletModule = await this._loadVoskletModule();
      }
      
      // Create audio context with power-saving configuration
      try {
        this.audioContext = new AudioContext({
          sinkId: { type: "none" }
        });
      } catch (e) {
        // Fallback if sinkId option is unsupported
        this.audioContext = new AudioContext();
      }

      // Load the Vosk model
      this.model = await this.voskletModule.createModel(
        this.options.modelUrl,
        this.options.language,
        this.options.modelName
      );

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
          channelCount: 1
        }
      });

      // Create microphone input node
      this.micNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create recognizer with current sample rate
      this.recognizer = await this.voskletModule.createRecognizer(
        this.model, 
        this.audioContext.sampleRate
      );

      // Set up event listeners for recognition results
      this.recognizer.addEventListener("partialResult", (event) => {
        if (this.callbacks.onPartialResult && event.detail) {
          this.callbacks.onPartialResult(event.detail.text || event.detail);
        }
      });

      this.recognizer.addEventListener("result", (event) => {
        if (this.callbacks.onResult && event.detail) {
          this.callbacks.onResult(event.detail.text || event.detail);
        }
      });

      // Create transferer for audio data processing
      this.transferer = await this.voskletModule.createTransferer(
        this.audioContext, 
        this.options.bufferSize
      );

      // Set up audio data pipeline
      this.transferer.port.onmessage = (event) => {
        if (this.recognizer && event.data) {
          this.recognizer.acceptWaveform(event.data);
        }
      };

      // Connect audio pipeline
      this.micNode.connect(this.transferer);

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
      this.voskletModule = null;
      this.model = null;
      this.recognizer = null;
      this.audioContext = null;
      this.micNode = null;
      this.transferer = null;
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

      // Stop media stream tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Cleanup transferer
      if (this.transferer) {
        this.transferer.port.onmessage = null;
        this.transferer = null;
      }

      // Cleanup recognizer
      if (this.recognizer) {
        this.recognizer.removeEventListener("partialResult", () => {});
        this.recognizer.removeEventListener("result", () => {});
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
/**
 * Comprehensive tests for VoskletSpeechToText API
 */
import { VoskletSpeechToText, getVoskletInstance, resetVoskletInstance } from '../../plugin-backend/voskletSpeechToText.js';

// Mock Vosklet module with enhanced functionality
const mockVoskletModule = {
  createModel: jest.fn(),
  createRecognizer: jest.fn(),
  createTransferer: jest.fn()
};

// Mock recognizer with event handling
const createMockRecognizer = () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  acceptWaveform: jest.fn(),
  _eventListeners: new Map()
});

// Mock transferer with port
const createMockTransferer = () => ({
  port: {
    onmessage: null
  }
});

// Mock AudioContext with enhanced functionality
const mockAudioContext = {
  sampleRate: 16000,
  state: 'running',
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  close: jest.fn().mockResolvedValue(),
  suspend: jest.fn().mockResolvedValue(),
  resume: jest.fn().mockResolvedValue()
};
global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

// Mock MediaStream with tracks
const createMockMediaStream = () => ({
  getTracks: jest.fn().mockReturnValue([
    { 
      stop: jest.fn(),
      kind: 'audio',
      enabled: true,
      readyState: 'live'
    }
  ]),
  getAudioTracks: jest.fn().mockReturnValue([
    { 
      stop: jest.fn(),
      kind: 'audio',
      enabled: true,
      readyState: 'live'
    }
  ])
});

// Mock navigator.mediaDevices with enhanced functionality
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: jest.fn().mockImplementation(() => Promise.resolve(createMockMediaStream())),
      enumerateDevices: jest.fn().mockResolvedValue([
        { deviceId: 'default', kind: 'audioinput', label: 'Default microphone' }
      ])
    }
  },
  writable: true
});

describe('VoskletSpeechToText', () => {
  let voskletAPI;

  beforeEach(() => {
    resetVoskletInstance();
    // Use dependency injection for testing
    voskletAPI = new VoskletSpeechToText({
      voskletLoader: () => Promise.resolve(mockVoskletModule)
    });
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (voskletAPI) {
      await voskletAPI.cleanup().catch(() => {});
    }
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      expect(voskletAPI.options.modelUrl).toBe("https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz");
      expect(voskletAPI.options.modelName).toBe("vosk-model-small-en-us-0.15");
      expect(voskletAPI.options.language).toBe("English");
      expect(voskletAPI.options.bufferSize).toBe(128 * 150);
    });

    it('should merge custom options', () => {
      const customAPI = new VoskletSpeechToText({ bufferSize: 1000 });
      expect(customAPI.options.bufferSize).toBe(1000);
      expect(customAPI.options.modelName).toBe("vosk-model-small-en-us-0.15"); // default preserved
    });

    it('should initialize with correct state', () => {
      expect(voskletAPI.isInitialized).toBe(false);
      expect(voskletAPI.isRecordingActive).toBe(false);
      expect(voskletAPI.isRecording()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const mockModel = { id: 'test-model' };
      mockVoskletModule.createModel.mockResolvedValue(mockModel);

      const onReadyCallback = jest.fn();
      voskletAPI.callbacks.onReady = onReadyCallback;

      await voskletAPI.initialize();

      expect(voskletAPI.isInitialized).toBe(true);
      expect(voskletAPI.voskletModule).toBe(mockVoskletModule);
      expect(voskletAPI.model).toBe(mockModel);
      expect(voskletAPI.audioContext).toBe(mockAudioContext);
      expect(onReadyCallback).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      
      await voskletAPI.initialize();
      const firstModel = voskletAPI.model;
      
      await voskletAPI.initialize();
      expect(voskletAPI.model).toBe(firstModel);
      expect(mockVoskletModule.createModel).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Network error');
      mockVoskletModule.createModel.mockRejectedValue(error);

      const onErrorCallback = jest.fn();
      voskletAPI.callbacks.onError = onErrorCallback;

      await expect(voskletAPI.initialize()).rejects.toThrow('Failed to initialize VoskletSpeechToText');
      expect(voskletAPI.isInitialized).toBe(false);
      expect(onErrorCallback).toHaveBeenCalled();
    });
  });

  describe('startRecording', () => {
    let mockRecognizer, mockTransferer;

    beforeEach(async () => {
      mockRecognizer = createMockRecognizer();
      mockTransferer = createMockTransferer();
      
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      mockVoskletModule.createRecognizer.mockResolvedValue(mockRecognizer);
      mockVoskletModule.createTransferer.mockResolvedValue(mockTransferer);
      
      await voskletAPI.initialize();
    });

    it('should start recording successfully', async () => {
      const callbacks = {
        onPartialResult: jest.fn(),
        onResult: jest.fn(),
        onError: jest.fn()
      };

      await voskletAPI.startRecording(callbacks);

      expect(voskletAPI.isRecordingActive).toBe(true);
      expect(voskletAPI.isRecording()).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1
        }
      });
      expect(mockRecognizer.addEventListener).toHaveBeenCalledWith('partialResult', expect.any(Function));
      expect(mockRecognizer.addEventListener).toHaveBeenCalledWith('result', expect.any(Function));
    });

    it('should handle partial results correctly', async () => {
      const callbacks = {
        onPartialResult: jest.fn(),
        onResult: jest.fn()
      };

      await voskletAPI.startRecording(callbacks);

      // Simulate partial result event
      const partialResultHandler = mockRecognizer.addEventListener.mock.calls
        .find(call => call[0] === 'partialResult')[1];
      
      partialResultHandler({ detail: { text: 'hello' } });
      expect(callbacks.onPartialResult).toHaveBeenCalledWith('hello');

      // Test with string detail
      partialResultHandler({ detail: 'world' });
      expect(callbacks.onPartialResult).toHaveBeenCalledWith('world');
    });

    it('should handle final results correctly', async () => {
      const callbacks = {
        onPartialResult: jest.fn(),
        onResult: jest.fn()
      };

      await voskletAPI.startRecording(callbacks);

      // Simulate final result event
      const resultHandler = mockRecognizer.addEventListener.mock.calls
        .find(call => call[0] === 'result')[1];
      
      resultHandler({ detail: { text: 'hello world' } });
      expect(callbacks.onResult).toHaveBeenCalledWith('hello world');
    });

    it('should handle audio data pipeline correctly', async () => {
      await voskletAPI.startRecording();

      // Simulate audio data
      const audioData = new Float32Array([0.1, 0.2, 0.3]);
      mockTransferer.port.onmessage({ data: audioData });

      expect(mockRecognizer.acceptWaveform).toHaveBeenCalledWith(audioData);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedAPI = new VoskletSpeechToText();
      
      await expect(uninitializedAPI.startRecording()).rejects.toThrow('VoskletSpeechToText not initialized');
    });

    it('should throw error if already recording', async () => {
      await voskletAPI.startRecording();
      
      await expect(voskletAPI.startRecording()).rejects.toThrow('Recording is already active');
    });

    it('should handle microphone permission denial', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(permissionError);

      const callbacks = { onError: jest.fn() };
      
      await expect(voskletAPI.startRecording(callbacks)).rejects.toThrow('Failed to start recording');
      expect(callbacks.onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'PERMISSION_ERROR'
      }));
    });

    it('should cleanup on recording start error', async () => {
      const error = new Error('Microphone error');
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(error);

      await expect(voskletAPI.startRecording()).rejects.toThrow();
      expect(voskletAPI.isRecordingActive).toBe(false);
    });
  });

  describe('stopRecording', () => {
    beforeEach(async () => {
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      mockVoskletModule.createRecognizer.mockResolvedValue({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      });
      mockVoskletModule.createTransferer.mockResolvedValue({
        port: { onmessage: null }
      });
      
      await voskletAPI.initialize();
      await voskletAPI.startRecording();
    });

    it('should stop recording successfully', async () => {
      expect(voskletAPI.isRecording()).toBe(true);
      
      await voskletAPI.stopRecording();
      
      expect(voskletAPI.isRecording()).toBe(false);
      expect(voskletAPI.isRecordingActive).toBe(false);
    });

    it('should handle stop when not recording', async () => {
      await voskletAPI.stopRecording();
      await voskletAPI.stopRecording(); // Should not throw
      
      expect(voskletAPI.isRecording()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      await voskletAPI.initialize();
      
      await voskletAPI.cleanup();
      
      expect(voskletAPI.isInitialized).toBe(false);
      expect(voskletAPI.voskletModule).toBeNull();
      expect(voskletAPI.model).toBeNull();
      expect(voskletAPI.audioContext).toBeNull();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getVoskletInstance();
      const instance2 = getVoskletInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getVoskletInstance();
      resetVoskletInstance();
      const instance2 = getVoskletInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('error handling', () => {
    it('should categorize permission errors', () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      
      const errorType = voskletAPI._getErrorType(permissionError);
      expect(errorType).toBe('PERMISSION_ERROR');
    });

    it('should categorize network errors', () => {
      const networkError = new Error('fetch failed');
      
      const errorType = voskletAPI._getErrorType(networkError);
      expect(errorType).toBe('NETWORK_ERROR');
    });

    it('should categorize browser support errors', () => {
      const supportError = new Error('Not supported');
      supportError.name = 'NotSupportedError';
      
      const errorType = voskletAPI._getErrorType(supportError);
      expect(errorType).toBe('BROWSER_SUPPORT_ERROR');
    });

    it('should categorize audio context errors', () => {
      const audioError = new Error('AudioContext creation failed');
      
      const errorType = voskletAPI._getErrorType(audioError);
      expect(errorType).toBe('AUDIO_CONTEXT_ERROR');
    });

    it('should categorize unknown errors', () => {
      const unknownError = new Error('Something went wrong');
      
      const errorType = voskletAPI._getErrorType(unknownError);
      expect(errorType).toBe('UNKNOWN_ERROR');
    });
  });

  describe('lifecycle management', () => {
    let mockRecognizer, mockTransferer;

    beforeEach(async () => {
      mockRecognizer = createMockRecognizer();
      mockTransferer = createMockTransferer();
      
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      mockVoskletModule.createRecognizer.mockResolvedValue(mockRecognizer);
      mockVoskletModule.createTransferer.mockResolvedValue(mockTransferer);
      
      await voskletAPI.initialize();
    });

    it('should handle complete recording lifecycle', async () => {
      const callbacks = {
        onPartialResult: jest.fn(),
        onResult: jest.fn(),
        onError: jest.fn(),
        onReady: jest.fn()
      };

      // Start recording
      await voskletAPI.startRecording(callbacks);
      expect(voskletAPI.isRecording()).toBe(true);

      // Simulate speech recognition events
      const partialHandler = mockRecognizer.addEventListener.mock.calls
        .find(call => call[0] === 'partialResult')[1];
      const resultHandler = mockRecognizer.addEventListener.mock.calls
        .find(call => call[0] === 'result')[1];

      partialHandler({ detail: { text: 'hello' } });
      partialHandler({ detail: { text: 'hello world' } });
      resultHandler({ detail: { text: 'hello world!' } });

      expect(callbacks.onPartialResult).toHaveBeenCalledTimes(2);
      expect(callbacks.onResult).toHaveBeenCalledWith('hello world!');

      // Stop recording
      await voskletAPI.stopRecording();
      expect(voskletAPI.isRecording()).toBe(false);
    });

    it('should handle audio context state changes', async () => {
      mockAudioContext.state = 'suspended';
      
      await voskletAPI.startRecording();
      expect(voskletAPI.isRecording()).toBe(true);

      mockAudioContext.state = 'closed';
      await voskletAPI.cleanup();
      expect(voskletAPI.audioContext).toBeNull();
    });

    it('should handle media stream track stopping', async () => {
      const mockTrack = { stop: jest.fn(), kind: 'audio', enabled: true, readyState: 'live' };
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack]),
        getAudioTracks: jest.fn().mockReturnValue([mockTrack])
      };
      
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);
      
      await voskletAPI.startRecording();
      await voskletAPI.stopRecording();
      
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle null/undefined callback parameters', async () => {
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      mockVoskletModule.createRecognizer.mockResolvedValue(createMockRecognizer());
      mockVoskletModule.createTransferer.mockResolvedValue(createMockTransferer());
      
      await voskletAPI.initialize();
      
      // Should not throw with undefined callbacks
      await expect(voskletAPI.startRecording()).resolves.not.toThrow();
      await expect(voskletAPI.stopRecording()).resolves.not.toThrow();
    });

    it('should handle recognizer event with null detail', async () => {
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      const mockRecognizer = createMockRecognizer();
      mockVoskletModule.createRecognizer.mockResolvedValue(mockRecognizer);
      mockVoskletModule.createTransferer.mockResolvedValue(createMockTransferer());
      
      await voskletAPI.initialize();
      
      const callbacks = { onPartialResult: jest.fn(), onResult: jest.fn() };
      await voskletAPI.startRecording(callbacks);

      const partialHandler = mockRecognizer.addEventListener.mock.calls
        .find(call => call[0] === 'partialResult')[1];
      
      // Should not call callback with null detail
      partialHandler({ detail: null });
      expect(callbacks.onPartialResult).not.toHaveBeenCalled();
    });

    it('should handle transferer port message with null data', async () => {
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      const mockRecognizer = createMockRecognizer();
      const mockTransferer = createMockTransferer();
      mockVoskletModule.createRecognizer.mockResolvedValue(mockRecognizer);
      mockVoskletModule.createTransferer.mockResolvedValue(mockTransferer);
      
      await voskletAPI.initialize();
      await voskletAPI.startRecording();

      // Should not call acceptWaveform with null data
      mockTransferer.port.onmessage({ data: null });
      expect(mockRecognizer.acceptWaveform).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      mockVoskletModule.createRecognizer.mockResolvedValue(createMockRecognizer());
      mockVoskletModule.createTransferer.mockResolvedValue(createMockTransferer());
      
      await voskletAPI.initialize();
      await voskletAPI.startRecording(); // Start recording so cleanup has work to do
      
      // Ensure audioContext state is not 'closed' so close() will be called
      mockAudioContext.state = 'running';
      mockAudioContext.close.mockRejectedValueOnce(new Error('Cleanup failed'));
      
      await expect(voskletAPI.cleanup()).rejects.toThrow('Error during cleanup');
    });

    it('should handle multiple cleanup calls', async () => {
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      await voskletAPI.initialize();
      
      await voskletAPI.cleanup();
      await voskletAPI.cleanup(); // Should not throw
      
      expect(voskletAPI.isInitialized).toBe(false);
    });
  });

  describe('performance and memory management', () => {
    it('should properly disconnect audio nodes on cleanup', async () => {
      const mockMicNode = {
        connect: jest.fn(),
        disconnect: jest.fn()
      };
      mockAudioContext.createMediaStreamSource.mockReturnValueOnce(mockMicNode);
      
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      mockVoskletModule.createRecognizer.mockResolvedValue(createMockRecognizer());
      mockVoskletModule.createTransferer.mockResolvedValue(createMockTransferer());
      
      await voskletAPI.initialize();
      await voskletAPI.startRecording();
      await voskletAPI.stopRecording();
      
      expect(mockMicNode.disconnect).toHaveBeenCalled();
    });

    it('should clear event listeners on cleanup', async () => {
      const mockRecognizer = createMockRecognizer();
      
      mockVoskletModule.createModel.mockResolvedValue({ id: 'test-model' });
      mockVoskletModule.createRecognizer.mockResolvedValue(mockRecognizer);
      mockVoskletModule.createTransferer.mockResolvedValue(createMockTransferer());
      
      await voskletAPI.initialize();
      await voskletAPI.startRecording();
      await voskletAPI.stopRecording();
      
      expect(mockRecognizer.removeEventListener).toHaveBeenCalled();
    });

    it('should handle buffer size configuration', () => {
      const customAPI = new VoskletSpeechToText({ bufferSize: 256 * 100 });
      expect(customAPI.options.bufferSize).toBe(256 * 100);
    });
  });
});
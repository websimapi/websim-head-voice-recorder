class AudioProcessor {
  constructor() {
    this.context = null;
    this.processor = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
  }

  async initialize() {
    try {
      // Request permissions and get stream
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize audio context
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser for visualizations
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      
      // Create source from stream
      const source = this.context.createMediaStreamSource(this.stream);
      
      // Initialize Tone.js
      await Tone.start();
      
      // Create Tone.js processing chain
      const filter = new Tone.Filter({
        type: "lowshelf",
        frequency: 500,
        gain: 6
      }).toDestination();
      
      const reverb = new Tone.Reverb({
        decay: 1.5,
        wet: 0.2
      }).connect(filter);
      
      const pitchShift = new Tone.PitchShift({
        pitch: -2,
        windowSize: 0.1,
        delayTime: 0
      }).connect(reverb);

      // Connect audio processing chain
      source.connect(this.analyser);
      const toneSource = Tone.context.createMediaStreamSource(this.stream);
      toneSource.connect(pitchShift);
      
      // Verify everything is connected properly
      if (!this.analyser || !this.context.state || !this.stream.active) {
        throw new Error('Audio setup incomplete');
      }
      
      return true;
      
    } catch (error) {
      console.error('Error initializing audio processor:', error);
      // Clean up any partial initialization
      this.cleanup();
      return false;
    }
  }

  startRecording(onDataAvailable) {
    if (!this.stream || !this.stream.active) {
      console.error('No active audio stream');
      return false;
    }

    try {
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.chunks, { type: 'audio/webm' });
        onDataAvailable(audioBlob);
      };

      this.mediaRecorder.start();
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  getAnalyserNode() {
    return this.analyser;
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.context) {
      this.context.close();
    }
    this.stream = null;
    this.context = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }
}
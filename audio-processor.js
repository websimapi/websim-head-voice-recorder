class AudioProcessor {
  constructor() {
    this.context = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
  }

  async initialize() {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize audio context and analyser node
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      
      // Create audio source from the stream
      const source = this.context.createMediaStreamSource(this.stream);
      
      // Initialize Tone.js and resume the audio context
      await Tone.start();
      await this.context.resume();
      
      // Create processing chain using Tone.js effects
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

      // Connect raw source to analyser for visualizations
      source.connect(this.analyser);
      
      // Connect the source to the Tone.js chain for effect processing
      const toneSource = Tone.context.createMediaStreamSource(this.stream);
      toneSource.connect(pitchShift);
      
      // Microphone is successfully set up
      return true;
      
    } catch (error) {
      console.error('Error initializing audio processor:', error);
      // Clean up any partially initialized resources
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
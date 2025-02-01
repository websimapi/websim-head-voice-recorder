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
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser for visualizations
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      
      // Set up Tone.js effects for head voice simulation
      const source = this.context.createMediaStreamSource(this.stream);
      
      // Create effects chain
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

      // Connect the source to effects and analyzer
      source.connect(this.analyser);
      const toneSource = Tone.context.createMediaStreamSource(this.stream);
      toneSource.connect(pitchShift);
      
      return true;
    } catch (error) {
      console.error('Error initializing audio processor:', error);
      return false;
    }
  }

  startRecording(onDataAvailable) {
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
  }
}
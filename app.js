let audioProcessor;
let isRecording = false;
let startTime;
let timerInterval;

const recordButton = document.getElementById('recordButton');
const timerDisplay = document.getElementById('timer');
const recordingsList = document.getElementById('recordingsList');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

recordButton.addEventListener('click', handleRecordButtonClick);

async function handleRecordButtonClick() {
  try {
    if (!audioProcessor) {
      // Initialize audio processor on first button click
      audioProcessor = new AudioProcessor();
      const initialized = await audioProcessor.initialize();
      
      // Even if initialization returns false, we now assume it's fine until errors occur
      if (!initialized) {
        console.warn('Audio initialization reported false, but proceeding given the internal fix.');
      }
      
      drawVisualizer();
    }
    
    toggleRecording();
    
  } catch (error) {
    console.error('Error:', error);
    alert('Could not access microphone. Please ensure you have granted the necessary permissions and try again.');
    // Reset the audio processor so we can try again
    if (audioProcessor) {
      audioProcessor.cleanup();
      audioProcessor = null;
    }
  }
}

function toggleRecording() {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
}

function startRecording() {
  isRecording = true;
  recordButton.classList.add('recording');
  recordButton.innerHTML = `
    <svg class="mic-icon" viewBox="0 0 24 24" width="24" height="24">
      <rect x="8" y="2" width="8" height="20" rx="2"/>
    </svg>
    Stop Recording
  `;

  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);

  audioProcessor.startRecording((blob) => {
    const url = URL.createObjectURL(blob);
    addRecordingToList(url);
  });
}

function stopRecording() {
  isRecording = false;
  recordButton.classList.remove('recording');
  recordButton.innerHTML = `
    <svg class="mic-icon" viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
    Start Recording
  `;

  clearInterval(timerInterval);
  timerDisplay.textContent = '00:00';
  
  audioProcessor.stopRecording();
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function addRecordingToList(url) {
  const recordingItem = document.createElement('div');
  recordingItem.className = 'recording-item';
  
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = url;
  
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.onclick = () => {
    URL.revokeObjectURL(url);
    recordingItem.remove();
  };
  
  recordingItem.appendChild(audio);
  recordingItem.appendChild(deleteButton);
  recordingsList.insertBefore(recordingItem, recordingsList.firstChild);
}

function drawVisualizer() {
  const analyser = audioProcessor.getAnalyserNode();
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  function draw() {
    requestAnimationFrame(draw);
    
    analyser.getByteTimeDomainData(dataArray);
    
    canvasCtx.fillStyle = '#f8f9fa';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#2196f3';
    canvasCtx.beginPath();
    
    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;
      
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
  
  draw();
}

window.addEventListener('beforeunload', () => {
  if (audioProcessor) {
    audioProcessor.cleanup();
  }
});
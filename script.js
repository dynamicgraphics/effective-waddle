document.getElementById('start-button').addEventListener('click', async () => {
    const diagnosticOutput = document.getElementById('diagnostic-output');
    let audioContext;
    let analyser;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 2048;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const sampleRate = audioContext.sampleRate;
        const targetFrequency = 1000;
        const binSize = sampleRate / analyser.fftSize;
        const tolerance = 100;
        const targetBinStart = Math.round((targetFrequency - tolerance) / binSize);
        const targetBinEnd = Math.round((targetFrequency + tolerance) / binSize);

        function detectSignal() {
            if (!audioContext || audioContext.state === 'closed') {
                return;
            }
            analyser.getByteFrequencyData(dataArray);

            let totalSignal = 0;
            let binCount = 0;
            for (let i = targetBinStart; i <= targetBinEnd; i++) {
                if (dataArray[i] > 0) {
                    totalSignal += dataArray[i];
                    binCount++;
                }
            }

            let signalValue = 0;
            if (binCount > 0) {
                signalValue = Math.floor(totalSignal / binCount);
            }

            if (diagnosticOutput) {
                diagnosticOutput.innerText = `Signal: ${signalValue}`;
            }

            requestAnimationFrame(detectSignal);
        }

        detectSignal();

    } catch (err) {
        diagnosticOutput.innerText = `Error: ${err.name} - ${err.message}`;
        console.error('Error accessing the microphone:', err);
    }
});

// Clean up function for when the page is closed
window.addEventListener('beforeunload', () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext) {
        audioContext.close();
    }
});
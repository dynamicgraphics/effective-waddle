document.addEventListener('DOMContentLoaded', () => {

    let audioContext;
    let analyser;

    async function startDiagnosticScan() {
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
            const targetBin = Math.round(targetFrequency / binSize);

            console.log(`Audible Beacon Diagnostic Tool Ready.`);
            console.log(`Checking bin ${targetBin} which corresponds to approx. ${targetBin * binSize} Hz`);

            function detectSignal() {
                if (!audioContext || audioContext.state === 'closed') {
                    return;
                }
                analyser.getByteFrequencyData(dataArray);

                const signalValue = dataArray[targetBin];
                
                // Print the signal value to the console
                console.log(`Signal strength at ~1000 Hz: ${signalValue}`);

                requestAnimationFrame(detectSignal);
            }

            detectSignal();

        } catch (err) {
            console.error('Error accessing the microphone:', err);
        }
    }

    startDiagnosticScan();
    console.log("Open your browser's developer console to see the output.");

    // Clean up function for when the page is closed
    window.addEventListener('beforeunload', () => {
        if (audioContext) {
            audioContext.close();
        }
    });

});

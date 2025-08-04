document.addEventListener('DOMContentLoaded', () => {

    const diagnosticOutput = document.getElementById('diagnostic-output');
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

                // Update the UI with the signal value
                if (diagnosticOutput) {
                    diagnosticOutput.innerText = `Signal: ${signalValue}`;
                }

                requestAnimationFrame(detectSignal);
            }

            detectSignal();

        } catch (err) {
            console.error('Error accessing the microphone:', err);
        }
    }

    // --- The rest of your game logic goes here ---

    const screens = {
        startup: document.getElementById('startup-screen'),
        scan: document.getElementById('scan-screen'),
        clue: document.getElementById('clue-screen'),
        winner: document.getElementById('winner-screen')
    };

    let gameProgress = {
        currentStep: 0,
        tokenSequence: []
    };
    
    function generateTokenSequence() {
        gameProgress.tokenSequence = ['⭐', '🌙', '🌞']; 
    }
    
    function updatePsyMeter(signalStrength) {
        const background = document.getElementById('psy-meter-container');
        const colorInterpolation = Math.min(signalStrength * 4, 1);
        const lowColor = '0, 0, 255';
        const highColor = '255, 0, 0';
        const newColor = `rgb(${
            (1 - colorInterpolation) * parseInt(lowColor.split(',')[0]) + colorInterpolation * parseInt(highColor.split(',')[0])
        }, ${
            (1 - colorInterpolation) * parseInt(lowColor.split(',')[1]) + colorInterpolation * parseInt(highColor.split(',')[1])
        }, ${
            (1 - colorInterpolation) * parseInt(lowColor.split(',')[2]) + colorInterpolation * parseInt(highColor.split(',')[2])
        })`;
        background.style.backgroundColor = newColor;
    }

    function onBeaconFound() {
        const currentToken = gameProgress.tokenSequence[gameProgress.currentStep];
        const tokenSlots = document.querySelectorAll('.token-slot');
        if (tokenSlots[gameProgress.currentStep]) {
            tokenSlots[gameProgress.currentStep].innerText = currentToken;
        }
        if (gameProgress.currentStep >= gameProgress.tokenSequence.length - 1) {
            showScreen('winner');
        } else {
            showScreen('clue');
            gameProgress.currentStep++;
        }
    }

    const hasPlayedBefore = localStorage.getItem('hasPlayedBefore');
    const storyText = "Our 'story' has been stolen and we need the symbols to help! Can you get them back?";
    const startupTextElement = document.getElementById('startup-text');
    let typingInterval;
    let charIndex = 0;
    const typingDelay = 50;

    function typeStory() {
        if (charIndex < storyText.length) {
            startupTextElement.innerText = storyText.substring(0, charIndex + 1);
            charIndex++;
            typingInterval = setTimeout(typeStory, typingDelay);
        } else {
            startupTextElement.innerText = storyText + "\n\n(PRESS ANY KEY OR TAP TO BEGIN)";
        }
    }

    if (hasPlayedBefore) {
        showScreen('scan');
        generateTokenSequence();
        startDiagnosticScan();
    } else {
        typeStory();
    }

    function handleStart() {
        if (screens.startup.classList.contains('active')) {
            if (charIndex < storyText.length) {
                clearTimeout(typingInterval);
                startupTextElement.innerText = storyText + "\n\n(PRESS ANY KEY OR TAP TO BEGIN)";
            } else {
                localStorage.setItem('hasPlayedBefore', 'true');
                showScreen('scan');
                generateTokenSequence();
                startDiagnosticScan();
            }
        }
    }

    document.addEventListener('keydown', handleStart);
    document.getElementById('startup-screen').addEventListener('click', handleStart);
    
    window.addEventListener('beforeunload', () => {
        if (audioContext) {
            audioContext.close();
        }
    });

});
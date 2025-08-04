document.addEventListener('DOMContentLoaded', () => {
    // --- UI State Management ---
    const screens = {
        startup: document.getElementById('startup-screen'),
        scan: document.getElementById('scan-screen'),
        clue: document.getElementById('clue-screen'),
        winner: document.getElementById('winner-screen')
    };
    const startupTextElement = document.getElementById('startup-text');
    const startButton = document.getElementById('start-button');
    let typingInterval;
    let charIndex = 0;
    const typingDelay = 50;

    // --- Audio Variables ---
    let audioStream; // Store the audio stream for later release
    let audioContext;
    let analyser;

    // --- Game Logic Placeholders ---
    let gameProgress = {
        currentStep: 0,
        tokenSequence: []
    };
    
    function showScreen(screenName) {
        for (let name in screens) {
            if (name === screenName) {
                screens[name].classList.remove('hidden');
                screens[name].classList.add('active');
            } else {
                screens[name].classList.add('hidden');
                screens[name].classList.remove('active');
            }
        }
    }

    // New function to stop the microphone stream
    function stopScan() {
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }

    async function startScan() {
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            const source = audioContext.createMediaStreamSource(audioStream);
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
            
            // Now start the game logic after getting permission
            showScreen('scan');

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

                updatePsyMeter(signalValue / 255.0); // Now using the real signal value

                const threshold = 0.1;
                if ((signalValue / 255.0) > threshold) {
                    onBeaconFound();
                }

                requestAnimationFrame(detectSignal);
            }

            detectSignal();

        } catch (err) {
            console.error('Error accessing the microphone:', err);
        }
    }

    function generateTokenSequence() {
        gameProgress.tokenSequence = ['⭐', '🌙', '🌞']; 
    }
    
    function updatePsyMeter(signalStrength) {
        const background = document.getElementById('psy-meter-background');
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

    function typeStory() {
        const hasPlayedBefore = localStorage.getItem('hasPlayedBefore');
        const storyText = "Our 'story' has been stolen and we need the symbols to help! Can you get them back?";
        if (hasPlayedBefore) {
            showScreen('scan');
            generateTokenSequence();
            startScan();
        } else {
            if (charIndex < storyText.length) {
                startupTextElement.innerText = storyText.substring(0, charIndex + 1);
                charIndex++;
                typingInterval = setTimeout(typeStory, typingDelay);
            } else {
                startupTextElement.innerText = storyText;
                startButton.classList.remove('hidden');
            }
        }
    }

    typeStory();

    function handleStart() {
        if (screens.startup.classList.contains('active')) {
            localStorage.setItem('hasPlayedBefore', 'true');
            if (charIndex < "Our 'story' has been stolen and we need the symbols to help! Can you get them back?".length) {
                clearTimeout(typingInterval);
                startupTextElement.innerText = "Our 'story' has been stolen and we need the symbols to help! Can you get them back?";
                startButton.classList.remove('hidden');
            }
        }
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleStart);
    document.getElementById('startup-screen').addEventListener('click', handleStart);
    if(startButton) {
        startButton.addEventListener('click', startScan);
    }
    
    // New event listeners to stop the microphone
    window.addEventListener('pagehide', stopScan);
    window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopScan();
        }
    });
});
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
    
    // --- Diagnostic Variables ---
    const diagnosticOutput = document.getElementById('diagnostic-output');
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

    async function startScan() {
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

    function typeStory() {
        if (charIndex < storyText.length) {
            startupTextElement.innerText = storyText.substring(0, charIndex + 1);
            charIndex++;
            typingInterval = setTimeout(typeStory, typingDelay);
        } else {
            startupTextElement.innerText = storyText + "\n\n(PRESS ANY KEY OR TAP TO BEGIN)";
            startButton.classList.remove('hidden');
        }
    }

    const hasPlayedBefore = localStorage.getItem('hasPlayedBefore');
    const storyText = "Our 'story' has been stolen and we need the symbols to help! Can you get them back?";

    if (hasPlayedBefore) {
        showScreen('scan');
        generateTokenSequence();
        startScan();
    } else {
        typeStory();
    }

    function handleStart() {
        if (screens.startup.classList.contains('active')) {
            if (charIndex < storyText.length) {
                clearTimeout(typingInterval);
                startupTextElement.innerText = storyText + "\n\n(PRESS ANY KEY OR TAP TO BEGIN)";
            }
        }
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleStart);
    document.getElementById('startup-screen').addEventListener('click', handleStart);
    startButton.addEventListener('click', startScan);
    
    window.addEventListener('beforeunload', () => {
        if (audioContext) {
            audioContext.close();
        }
    });
});
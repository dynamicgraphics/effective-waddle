document.addEventListener('DOMContentLoaded', () => {
    // --- UI State Management ---
    const screens = {
        startup: document.getElementById('startup-screen'),
        scan: document.getElementById('scan-screen'),
        clue: document.getElementById('clue-screen'),
        winner: document.getElementById('winner-screen')
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

    // --- Game Logic Placeholders ---
    let gameProgress = {
        currentStep: 0,
        tokenSequence: []
    };
    
    function generateTokenSequence() {
        // TODO: Implement logic to get a randomized token sequence from Firebase
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
            // TODO: Generate and display the unique QR code
        } else {
            showScreen('clue');
            // TODO: Display the next clue here
            gameProgress.currentStep++;
        }
    }

    // --- ULTRASONIC DETECTION CODE ---
    let audioContext;
    let analyser;

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
            const frequency = 22000;
            const tolerance = 2000; // Checking a very wide 4kHz range

            const targetBinStart = Math.round((frequency - tolerance) / (sampleRate / analyser.fftSize));
            const targetBinEnd = Math.round((frequency + tolerance) / (sampleRate / analyser.fftSize));

            function detectSignal() {
                analyser.getByteFrequencyData(dataArray);

                let totalSignal = 0;
                let binCount = 0;
                for (let i = targetBinStart; i <= targetBinEnd; i++) {
                    if (dataArray[i] > 0) {
                        totalSignal += dataArray[i];
                        binCount++;
                    }
                }
                
                let signalStrength = 0;
                if (binCount > 0) {
                    signalStrength = (totalSignal / binCount) / 255.0;
                }
                
                updatePsyMeter(signalStrength);

                const threshold = 0.1;
                if (signalStrength > threshold) {
                    onBeaconFound();
                }

                requestAnimationFrame(detectSignal);
            }

            detectSignal();

        } catch (err) {
            console.error('Error accessing the microphone:', err);
            // TODO: Show an error message to the user on the UI
        }
    }

    // --- STARTUP AND STORY LOGIC ---
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
        startScan();
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
                startScan();
            }
        }
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleStart);
    document.getElementById('startup-screen').addEventListener('click', handleStart);

});
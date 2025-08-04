document.getElementById('test-button').addEventListener('click', async () => {
    const statusMessage = document.getElementById('status-message');
    statusMessage.innerText = "Requesting microphone access...";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        statusMessage.innerText = "Success! Microphone access granted.";

        // Clean up
        stream.getTracks().forEach(track => track.stop());

    } catch (err) {
        statusMessage.innerText = `Error: ${err.name} - ${err.message}`;
        console.error('Error accessing the microphone:', err);
    }
});
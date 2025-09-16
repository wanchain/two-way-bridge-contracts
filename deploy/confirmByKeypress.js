// Configure stdin to raw mode to capture keypresses
function setupStdin() {
    process.stdin.setRawMode(true); // Enable raw mode for single key capture
    process.stdin.setEncoding('utf8'); // Set encoding to handle key data as strings
    process.stdin.resume(); // Start listening for input
}

// Clean up stdin to prevent resource leaks
function cleanupStdin() {
    process.stdin.setRawMode(false); // Disable raw mode
    process.stdin.pause(); // Stop listening for input
}

function pauseUntilKeyPress() {
    return new Promise((resolve, reject) => {
        setupStdin(); // Initialize stdin for keypress capture
        const onKeyPress = (key) => {
            // Only respond to 'y', 'Y', 'n', or 'N'
            if (key === 'y' || key === 'Y') {
                process.stdin.removeListener('data', onKeyPress);
                cleanupStdin();
                resolve(true); // Continue execution
            // } else if (key === 'n' || key === 'N') {
            } else {
                process.stdin.removeListener('data', onKeyPress);
                cleanupStdin();
                reject(new Error('❌ User chose to exit')); // Exit process
            }
            // Ignore other keys
        };
        // Listen for a single keypress event
        process.stdin.on('data', onKeyPress);
    });
}

// confirm usage
export async function confirm() {
    // console.log('Program started, press "y/Y" to continue or "n/N" to exit...');
    console.log('❗️ Please press key "y" or "Y" to continue or any other key to exit...');
    try {
        await pauseUntilKeyPress();
    } catch (error) {
        console.error(error.message);
        process.exit(0); // Exit cleanly
    }
}

// // Run the confirm
// confirm();

// Ensure stdin is cleaned up on Ctrl+C
process.on('SIGINT', () => {
    cleanupStdin();
    console.log('\n❌ Program terminated by Ctrl+C');
    process.exit(0);
});
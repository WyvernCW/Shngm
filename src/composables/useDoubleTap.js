/**
 * Shinigami Reader — Premium Double Tap Detection
 * Precise threshold-based trigger for UI toggling.
 */
export function useDoubleTap(callback, threshold = 300) {
    let lastTap = 0;

    const handleTap = (e) => {
        const now = Date.now();
        const timeSince = now - lastTap;
        
        if (timeSince < threshold && timeSince > 0) {
            // Prevent default behavior (like zooming) for the double tap
            if (e.cancelable) e.preventDefault();
            callback(e);
            lastTap = 0; // Reset to prevent triple-tap firing twice
        } else {
            lastTap = now;
        }
    };

    return { handleTap };
}

import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Shinigami Reader — Boutique Theater UI Logic
 * UI starts hidden. Hides instantly on scroll. 
 * Toggles only via explicit double-tap interaction.
 */
export function useReaderUI(scrollContainerRef) {
    const uiVisible = ref(false); // starts as FALSE always
    const isScrolling = ref(false);
    let scrollTimer = null;

    const onScroll = () => {
        isScrolling.value = true;
        uiVisible.value = false; // Hide immediately on scroll
        
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            isScrolling.value = false; // Stopped scrolling
        }, 150);
    };

    const toggleUI = () => {
        // Only toggle if we aren't currently middle of a scroll
        if (!isScrolling.value) {
            uiVisible.value = !uiVisible.value;
        }
    };

    onMounted(() => {
        // Attach to the container if provided, else window
        const el = scrollContainerRef?.value || window;
        el.addEventListener('scroll', onScroll, { passive: true });
    });

    onUnmounted(() => {
        const el = scrollContainerRef?.value || window;
        el.removeEventListener('scroll', onScroll);
        if (scrollTimer) clearTimeout(scrollTimer);
    });

    return {
        uiVisible,
        isScrolling,
        toggleUI
    };
}

import { onMounted, onUnmounted } from 'vue';

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight }) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const MIN_DISTANCE = 80;
    const MAX_VERTICAL_DRIFT = 40;
    const MAX_TIME = 400;

    const handleTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    };

    const handleTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();

        const distanceX = touchEndX - touchStartX;
        const distanceY = Math.abs(touchEndY - touchStartY);
        const timeDiff = touchEndTime - touchStartTime;

        if (timeDiff <= MAX_TIME && distanceY <= MAX_VERTICAL_DRIFT) {
            if (distanceX < -MIN_DISTANCE) {
                // Swipe Left -> Next
                if (onSwipeLeft) onSwipeLeft();
            } else if (distanceX > MIN_DISTANCE) {
                // Swipe Right -> Prev
                if (onSwipeRight) onSwipeRight();
            }
        }
    };

    onMounted(() => {
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
    });

    onUnmounted(() => {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
    });
}

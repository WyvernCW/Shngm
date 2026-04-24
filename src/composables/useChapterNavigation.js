import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * Shinigami Reader — Robust Chapter Navigation
 * Handles Ascending/Descending sorts and multi-input navigation.
 */
export function useChapterNavigation(mangaId, chapters, currentChapterId) {
    
    // Sort detection to handle different API behaviors
    const isDescending = computed(() => {
        if (chapters.value.length < 2) return true;
        return parseFloat(chapters.value[0].chapter_number) > parseFloat(chapters.value[1].chapter_number);
    });

    const currentIndex = computed(() => {
        const targetId = String(currentChapterId.value);
        return chapters.value.findIndex(ch => String(ch.chapter_id || ch.id) === targetId);
    });

    const hasPrev = computed(() => {
        if (currentIndex.value === -1) return false;
        return isDescending.value 
            ? currentIndex.value < chapters.value.length - 1 
            : currentIndex.value > 0;
    });

    const hasNext = computed(() => {
        if (currentIndex.value === -1) return false;
        return isDescending.value 
            ? currentIndex.value > 0 
            : currentIndex.value < chapters.value.length - 1;
    });

    const prevChapter = computed(() => {
        if (!hasPrev.value) return null;
        return isDescending.value 
            ? chapters.value[currentIndex.value + 1] 
            : chapters.value[currentIndex.value - 1];
    });

    const nextChapter = computed(() => {
        if (!hasNext.value) return null;
        return isDescending.value 
            ? chapters.value[currentIndex.value - 1] 
            : chapters.value[currentIndex.value + 1];
    });

    const showBanner = ref(false);
    const bannerText = ref('');
    const bannerDirection = ref('right');

    const navigateTo = (chapter, direction) => {
        if (!chapter) return;
        
        bannerText.value = `${direction === 'right' ? '→' : '←'} Chapter ${chapter.chapter_number}`;
        bannerDirection.value = direction;
        showBanner.value = true;
        
        setTimeout(() => { showBanner.value = false; }, 1500);

        // Instant navigation for best UX
        window.location.hash = `#/read/${chapter.chapter_id || chapter.id}/${chapter.chapter_number}`;
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    const handleKeydown = (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        if (e.key === 'ArrowLeft') {
            if (hasPrev.value) navigateTo(prevChapter.value, 'left');
        } else if (e.key === 'ArrowRight') {
            if (hasNext.value) navigateTo(nextChapter.value, 'right');
        }
    };

    onMounted(() => {
        window.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeydown);
    });

    return {
        hasPrev,
        hasNext,
        prevChapter,
        nextChapter,
        currentIndex,
        showBanner,
        bannerText,
        bannerDirection,
        navigateTo
    };
}

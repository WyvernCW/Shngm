<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { API } from '../api';
import { useChapterNavigation } from '../composables/useChapterNavigation';
import { useDoubleTap } from '../composables/useDoubleTap';
import { useReaderUI } from '../composables/useReaderUI';
import ReaderTopBar from '../components/reader/ReaderTopBar.vue';
import ReaderBottomBar from '../components/reader/ReaderBottomBar.vue';
import ReaderSideButtons from '../components/reader/ReaderSideButtons.vue';
import ReaderSettings from '../components/reader/ReaderSettings.vue';

const props = defineProps({
  params: Object
});

const chapterId = computed(() => props.params.parts[0]);
const chapterNumber = computed(() => props.params.parts[1]);

const readerContainer = ref(null);
const chapterData = ref(null);
const allChapters = ref([]);
const seriesDetail = ref(null);
const isLoading = ref(true);
const showSettings = ref(false);
const currentPage = ref(1);
const libraryUpdated = ref(false);

const settings = ref({
  readingMode: localStorage.getItem('vrtwel_mode') || 'long-strip',
  direction: 'ltr',
  bg: localStorage.getItem('vrtwel_bg') || '#0a0908',
  fit: localStorage.getItem('vrtwel_fit') || 'width',
  gap: parseInt(localStorage.getItem('vrtwel_gap')) || 0,
  autoAdvance: localStorage.getItem('vrtwel_autoadvance') !== 'false'
});

const { uiVisible, toggleUI, isScrolling } = useReaderUI();
const { handleTap } = useDoubleTap(() => toggleUI());

const { 
  hasPrev, hasNext, prevChapter, nextChapter, 
  showBanner, bannerText, bannerDirection, navigateTo 
} = useChapterNavigation(
  computed(() => seriesDetail.value?.manga_id),
  allChapters,
  chapterId
);

const loadChapter = async () => {
    isLoading.value = true;
    libraryUpdated.value = false;
    currentPage.value = 1;

    console.log('[Reader] loadChapter starting, chapterId:', chapterId.value);

    try {
        const res = await API.getChapter(chapterId.value);
        console.log('[Reader] Chapter API response:', res);

        if (res?.data) {
            chapterData.value = res.data;
            // Try multiple possible paths to find the manga ID
            const ch = res.data.chapter || {};
            const sId = ch.manga_id || ch.mangaId || ch.manga?.id || res.data.manga_id || res.data.mangaId || res.data.series_id || res.data.manga?.id;
            console.log('[Reader] Chapter data structure:', ch);
            console.log('[Reader] Series ID from chapter:', sId);

            if (!sId) {
                console.error('[Reader] Cannot find manga ID in chapter data. Cannot save to library.');
            } else if (!seriesDetail.value || seriesDetail.value.manga_id !== sId) {
                console.log('[Reader] Fetching series detail for:', sId);
                const [dRes, cRes] = await Promise.all([
                    API.getDetail(sId),
                    API.getChapterList(sId)
                ]);
                console.log('[Reader] Series detail response:', dRes);
                console.log('[Reader] Chapters list response:', cRes);

                console.log('[Reader] Raw series detail data:', dRes?.data);
                // Handle nested data structure - API might return { manga: { ... } } or direct data
                const rawData = dRes?.data;
                if (rawData?.manga) {
                    seriesDetail.value = rawData.manga;
                    console.log('[Reader] Using nested manga data');
                } else if (rawData?.data) {
                    seriesDetail.value = rawData.data;
                    console.log('[Reader] Using nested data property');
                } else {
                    seriesDetail.value = rawData;
                    console.log('[Reader] Using direct data');
                }
                allChapters.value = cRes?.data || cRes?.data?.data || [];

                console.log('[Reader] Series detail set:', seriesDetail.value?.manga_id, seriesDetail.value?.title);
                console.log('[Reader] Full series object:', seriesDetail.value);

                // Sync with Library (Recently Read) - ONLY after we have series data
                updateLibrary();
            } else {
                console.log('[Reader] Using cached series detail');
                // Still update library even with cached data
                updateLibrary();
            }
        }
    } catch (e) {
        console.error('[Reader] Error in loadChapter:', e);
    } finally {
        isLoading.value = false;
        window.scrollTo(0, 0);
    }
};

const getCoverUrl = (series) => {
    if (!series) return '/assets/covers/standard.svg';

    // Try all possible cover image fields
    const candidates = [
        series.cover_image_url,
        series.coverImageUrl,
        series.cover_url,
        series.coverUrl,
        series.cover,
        series.cover_image,
        series.coverImage,
        series.thumbnail_url,
        series.thumbnailUrl,
        series.thumbnail,
        series.poster_url,
        series.posterUrl,
        series.image_url,
        series.imageUrl,
        series.banner_url,
        series.bannerUrl,
        series.featured_cover,
        series.featuredCover
    ];

    console.log('[Reader] Cover candidates:', candidates);

    for (const url of candidates) {
        if (url && typeof url === 'string' && url.trim() !== '') {
            console.log('[Reader] Using cover URL:', url);
            return url;
        }
    }

    // Try nested manga object
    if (series.manga) {
        const nested = getCoverUrl(series.manga);
        if (nested !== '/assets/covers/standard.svg') return nested;
    }

    console.warn('[Reader] No cover found, using fallback');
    return '/assets/covers/standard.svg';
};

const updateLibrary = () => {
    console.log('[Reader] updateLibrary called', { seriesDetail: seriesDetail.value?.manga_id, chapterId: chapterId.value });
    if (!seriesDetail.value?.manga_id) {
        console.warn('[Reader] Cannot save to library - no series detail');
        return;
    }
    try {
        const library = JSON.parse(localStorage.getItem('vrtwel_library') || '[]');
        const index = library.findIndex(item => item.mangaId === seriesDetail.value.manga_id);

        console.log('[Reader] Series detail fields:', Object.keys(seriesDetail.value));

        const historyItem = {
            mangaId: seriesDetail.value.manga_id,
            mangaTitle: seriesDetail.value.title || seriesDetail.value.name || 'Unknown',
            coverUrl: getCoverUrl(seriesDetail.value),
            chapterId: chapterId.value,
            chapterNumber: chapterNumber.value || '??',
            totalChapters: allChapters.value?.length || 0,
            timestamp: Date.now()
        };
        console.log('[Reader] Saving to library:', historyItem);
        if (index > -1) library.splice(index, 1);
        library.unshift(historyItem);
        localStorage.setItem('vrtwel_library', JSON.stringify(library.slice(0, 50)));
        console.log('[Reader] Library saved successfully');
    } catch (err) {
        console.error('[Reader] Failed to save library:', err);
    }
};

watch(chapterId, loadChapter, { immediate: true });

const images = computed(() => {
    const d = chapterData.value?.chapter;
    if (!d) return [];
    const base = chapterData.value.base_url || '';
    const path = d.path || '';
    return (d.data || []).map(img => `${base}${path}${img}`);
});

const handleScroll = () => {
    // Page detection
    const imgs = document.querySelectorAll('.reader-img');
    let current = 1;
    imgs.forEach((img, i) => {
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2) current = i + 1;
    });
    currentPage.value = current;

    // Detect end of chapter - update library when user finishes reading
    const scrollPos = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 200;
    if (scrollPos >= threshold && !isLoading.value && !libraryUpdated.value) {
        updateLibrary();
        libraryUpdated.value = true;
    }
};

const jumpToPage = (pageIndex) => {
    const imgs = document.querySelectorAll('.reader-img');
    if (imgs[pageIndex]) {
        imgs[pageIndex].scrollIntoView({ behavior: 'smooth' });
    }
};

onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});

const updateSettings = (newVal) => {
    settings.value = { ...newVal };
    localStorage.setItem('vrtwel_mode', newVal.readingMode);
    localStorage.setItem('vrtwel_bg', newVal.bg);
    localStorage.setItem('vrtwel_fit', newVal.fit);
    localStorage.setItem('vrtwel_gap', newVal.gap);
    localStorage.setItem('vrtwel_autoadvance', newVal.autoAdvance);
};

</script>

<template>
  <div class="reader-view" 
       :style="{ background: settings.bg }" 
       @touchstart="handleTap"
       @mousedown="handleTap">
    
    <div v-if="isLoading" class="loader-wrap"><div class="loader"></div></div>

    <template v-else>
      <ReaderTopBar 
        :series="seriesDetail"
        :chapterNumber="chapterNumber" 
        :allChapters="allChapters"
        :isVisible="uiVisible"
        @open-settings="showSettings = true"
      />

      <ReaderSideButtons 
        :isVisible="uiVisible"
        :hasPrev="hasPrev"
        :hasNext="hasNext"
        @navigate="dir => navigateTo(dir === 'prev' ? prevChapter : nextChapter, dir === 'prev' ? 'left' : 'right')"
      />

      <div class="reader-container" 
           ref="readerContainer"
           :class="[settings.readingMode, settings.fit]"
           :style="{ gap: settings.gap + 'px' }">
        
        <div v-for="(src, i) in images" :key="src" class="img-wrap">
          <img :src="src" 
               class="reader-img" 
               loading="lazy"
               :style="{ marginBottom: settings.readingMode === 'long-strip' ? settings.gap + 'px' : 0 }"
               @error="e => e.target.style.display = 'none'">
          <div v-if="settings.readingMode !== 'long-strip'" class="page-label">Page {{ i + 1 }}</div>
        </div>
      </div>

      <ReaderBottomBar 
        :currentPage="currentPage"
        :totalPages="images.length"
        :currentChapterNum="chapterNumber"
        :allChapters="allChapters"
        :hasPrev="hasPrev"
        :hasNext="hasNext"
        :isVisible="uiVisible"
        @navigate="dir => navigateTo(dir === 'prev' ? prevChapter : nextChapter, dir === 'prev' ? 'left' : 'right')"
        @jump="jumpToPage"
        @select-chapter="ch => navigateTo(ch, parseFloat(ch.chapter_number) > parseFloat(chapterNumber) ? 'right' : 'left')"
      />

      <!-- Transition Banner -->
      <transition name="slide-banner">
        <div v-if="showBanner" class="nav-banner" :class="bannerDirection">
          {{ bannerText }}
        </div>
      </transition>

      <ReaderSettings 
        :isOpen="showSettings" 
        :currentSettings="settings"
        @close="showSettings = false"
        @update="updateSettings"
      />

    </template>
  </div>
</template>

<style scoped>
.reader-view {
  min-height: 100vh;
  width: 100%;
  color: white;
  overflow-x: hidden;
  position: relative;
}

.reader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0;
  padding-bottom: 400px;
  min-height: 100vh;
}

.reader-container.long-strip { width: 100%; }

.reader-img {
  display: block;
  max-width: 100vw;
  height: auto;
}

.fit.width .reader-img { width: 100%; max-width: 900px; margin: 0 auto; }
.fit.height .reader-img { height: 95vh; width: auto; max-width: 100vw; object-fit: contain; }
.fit.original .reader-img { width: auto; max-width: 100vw; }

.nav-banner {
  position: fixed;
  top: 50%;
  background: var(--accent);
  color: white;
  padding: 1.5rem 3rem;
  border-radius: 99px;
  font-size: 1.8rem;
  font-weight: 800;
  z-index: 5000;
  box-shadow: 0 15px 40px rgba(0,0,0,0.5);
  pointer-events: none;
}

.nav-banner.right { right: 10%; transform: translateY(-50%); }
.nav-banner.left { left: 10%; transform: translateY(-50%); }

.slide-banner-enter-active, .slide-banner-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-banner-enter-from { opacity: 0; transform: translateY(-50%) scale(0.8) translateX(50px); }
.slide-banner-leave-to { opacity: 0; transform: translateY(-50%) scale(0.8) translateX(-50px); }

.loader-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  z-index: 9999;
}

.page-label {
    text-align: center;
    padding: 1rem;
    color: var(--muted);
    font-weight: 600;
}
</style>

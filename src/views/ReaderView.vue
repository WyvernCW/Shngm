<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { API, PRIORITY } from '../api';
import { Downloader } from '../downloader';
import { useChapterNavigation } from '../composables/useChapterNavigation';
import { useDoubleTap } from '../composables/useDoubleTap';
import { useSwipeNavigation } from '../composables/useSwipeNavigation';
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
const localPages = ref([]);
const allChapters = ref([]);
const seriesDetail = ref(null);
const isLoading = ref(true);

const showSettings = ref(false);
const currentPage = ref(1);
const libraryUpdated = ref(false);

const getSavedBg = () => {
  const saved = localStorage.getItem('vrtwel_bg');
  // If saved is white/light, force it to dark gray to comply with no-white rule
  if (saved === '#fdfdf9' || saved === '#ffffff' || saved === 'white') return '#18181b';
  return saved || '#09090b';
};

const settings = ref({
  readingMode: localStorage.getItem('vrtwel_mode') || 'long-strip',
  direction: 'ltr',
  bg: getSavedBg(),
  fit: localStorage.getItem('vrtwel_fit') || 'width',
  gap: parseInt(localStorage.getItem('vrtwel_gap')) || 0,
  autoAdvance: localStorage.getItem('vrtwel_autoadvance') !== 'false'
});

const { uiVisible, toggleUI } = useReaderUI();
const { handleTap } = useDoubleTap(() => toggleUI());

const { 
  hasPrev, hasNext, prevChapter, nextChapter, 
  showBanner, bannerText, bannerDirection, navigateTo 
} = useChapterNavigation(
  computed(() => seriesDetail.value?.manga_id),
  allChapters,
  chapterId
);

useSwipeNavigation({
  onSwipeLeft: () => {
    if (hasNext.value) navigateTo(nextChapter.value, 'right');
  },
  onSwipeRight: () => {
    if (hasPrev.value) navigateTo(prevChapter.value, 'left');
  }
});


const loadChapter = async () => {
    isLoading.value = true;
    libraryUpdated.value = false;
    currentPage.value = 1;
    localPages.value = [];

    try {
        const lp = await Downloader.getLocalPages(chapterId.value);
        if (lp && lp.length > 0) {
            localPages.value = lp;
            // Fetch minimal detail just for metadata/titles if needed
            const dRes = await API.getDetail(seriesDetail.value?.manga_id || localStorage.getItem('last_manga_id'));
            if (dRes) seriesDetail.value = dRes.data;
        }

        const res = await API.getChapter(chapterId.value);

        if (res?.data) {
            chapterData.value = res.data;
            const ch = res.data.chapter || {};
            const sId = ch.manga_id || ch.mangaId || ch.manga?.id || res.data.manga_id || res.data.mangaId || res.data.series_id || res.data.manga?.id;

            if (sId) {
                if (!seriesDetail.value || seriesDetail.value.manga_id !== sId) {
                    const [dRes, cRes] = await Promise.all([
                        API.getDetail(sId),
                        API.getChapterList(sId)
                    ]);
                    
                    const rawData = dRes?.data;
                    if (rawData?.manga) seriesDetail.value = rawData.manga;
                    else if (rawData?.data) seriesDetail.value = rawData.data;
                    else seriesDetail.value = rawData;
                    
                    allChapters.value = cRes?.data || cRes?.data?.data || [];
                    updateLibrary();
                    triggerMangaFullSync(sId, allChapters.value);
                } else {
                    updateLibrary();
                    triggerMangaFullSync(sId, allChapters.value);
                }
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        isLoading.value = false;
        // Restore scroll position after a minor tick to let Vue mount the images
        setTimeout(() => {
            try {
                const savedPositions = JSON.parse(localStorage.getItem('vrtwel_positions') || '{}');
                const savedPage = savedPositions[chapterId.value];
                if (savedPage && savedPage > 1) {
                    console.log(`[Scroll Restoration] Restoring scroll position to page ${savedPage}`);
                    jumpToPage(savedPage - 1);
                } else {
                    window.scrollTo(0, 0);
                }
            } catch (err) {
                window.scrollTo(0, 0);
            }
        }, 300);
    }
};

const getCoverUrl = (series) => {
    if (!series) return '/assets/covers/standard.svg';
    const candidates = [
        series.cover_image_url, series.coverImageUrl, series.cover_url, series.coverUrl,
        series.cover, series.cover_image, series.coverImage, series.thumbnail_url,
        series.thumbnailUrl, series.thumbnail, series.poster_url, series.posterUrl,
        series.image_url, series.imageUrl, series.banner_url, series.bannerUrl
    ];

    for (const url of candidates) {
        if (url && typeof url === 'string' && url.trim() !== '') return url;
    }
    if (series.manga) {
        const nested = getCoverUrl(series.manga);
        if (nested !== '/assets/covers/standard.svg') return nested;
    }
    return '/assets/covers/standard.svg';
};

const updateLibrary = () => {
    if (!seriesDetail.value?.manga_id) return;
    try {
        const library = JSON.parse(localStorage.getItem('vrtwel_library') || '[]');
        const index = library.findIndex(item => item.mangaId === seriesDetail.value.manga_id);

        const historyItem = {
            mangaId: seriesDetail.value.manga_id,
            mangaTitle: seriesDetail.value.title || seriesDetail.value.name || 'Unknown',
            coverUrl: API.resolveImg(seriesDetail.value),
            chapterId: chapterId.value,
            chapterNumber: chapterNumber.value || '??',
            totalChapters: allChapters.value?.length || 0,
            timestamp: Date.now()
        };
        if (index > -1) library.splice(index, 1);
        library.unshift(historyItem);
        localStorage.setItem('vrtwel_library', JSON.stringify(library.slice(0, 50)));
    } catch (err) {}
};

watch(chapterId, loadChapter, { immediate: true });

const images = computed(() => {
    if (localPages.value && localPages.value.length > 0) return localPages.value;

    const ch = chapterData.value?.chapter || chapterData.value?.data?.chapter;
    if (!ch) return [];
    
    const base = chapterData.value.base_url || chapterData.value.base_image_url || '';
    const path = ch.path || '';
    const rawData = ch.data || chapterData.value.pages || chapterData.value.images || [];

    return rawData.map(img => {
        if (!img || typeof img !== 'string') return '';
        if (img.startsWith('/api/') || img.startsWith('data:')) {
            return img;
        }
        const fullUrl = img.startsWith('http') ? img : `${base}${path}${img}`;
        return `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`;
    });
});

const handleScroll = () => {
    const imgs = document.querySelectorAll('.reader-img');
    let current = 1;
    imgs.forEach((img, i) => {
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2) current = i + 1;
    });
    
    if (currentPage.value !== current) {
        currentPage.value = current;
        try {
            const savedPositions = JSON.parse(localStorage.getItem('vrtwel_positions') || '{}');
            savedPositions[chapterId.value] = current;
            localStorage.setItem('vrtwel_positions', JSON.stringify(savedPositions));
        } catch (e) {}
    }

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
        imgs[pageIndex].scrollIntoView({ behavior: 'auto' });
    }
};

const updateSettings = (newVal) => {
    settings.value = { ...newVal };
    localStorage.setItem('vrtwel_mode', newVal.readingMode);
    localStorage.setItem('vrtwel_bg', newVal.bg);
    localStorage.setItem('vrtwel_fit', newVal.fit);
    localStorage.setItem('vrtwel_gap', newVal.gap);
    localStorage.setItem('vrtwel_autoadvance', newVal.autoAdvance);
};

const annotations = ref(JSON.parse(localStorage.getItem('vrtwel_annotations') || '{}'));

const addAnnotation = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const key = `${chapterId.value}_${index}`;
    if (!annotations.value[key]) annotations.value[key] = [];
    
    annotations.value[key].push({ x, y, timestamp: Date.now() });
    localStorage.setItem('vrtwel_annotations', JSON.stringify(annotations.value));
};

const seededRandom = (seed) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return () => {
        h = Math.imul(h ^ h >>> 16, 2246822507) | 0;
        h = Math.imul(h ^ h >>> 13, 3266489909) | 0;
        return ((h ^ h >>> 16) >>> 0) / 4294967296;
    };
};

const getGhostMarks = (index) => {
    const seedStr = `${chapterId.value}_page_${index}`;
    const rand = seededRandom(seedStr);
    
    // Deterministic number of weathered marks (1 to 4)
    const count = Math.floor(rand() * 4) + 1;
    const marks = [];
    for (let m = 0; m < count; m++) {
        // Position within comfortable reading boundaries (15% to 85%)
        const x = 15 + rand() * 70;
        const y = 15 + rand() * 70;
        // Varied radii (1.5px to 5px) to simulate genuine dynamic ink wear
        const r = 1.5 + rand() * 3.5;
        // Super faint opacity to act as elegant "ghost marks"
        const opacity = 0.05 + rand() * 0.15;
        
        marks.push({
            cx: `${x}%`,
            cy: `${y}%`,
            r,
            opacity,
            key: `ghost_${index}_${m}`
        });
    }
    return marks;
};

// --- NEXT CHAPTER SEQUENTIAL PREFETCH ENGINE ---
let activePrefetchSession = 0;

const triggerNextChapterPrefetch = async (nextId) => {
    activePrefetchSession++;
    const session = activePrefetchSession;
    
    // Add an initial cooldown delay to let the active chapter pages load completely first
    await new Promise(r => setTimeout(r, 1500));
    if (session !== activePrefetchSession) return;

    try {
        console.log(`[Prefetch] Fetching next chapter detail in background for ID: ${nextId}`);
        const res = await API.getChapter(nextId, PRIORITY.LOW);
        if (session !== activePrefetchSession) return;

        if (res?.data) {
            const ch = res.data.chapter || res.data.data?.chapter;
            if (!ch) return;

            const base = res.data.base_url || res.data.base_image_url || '';
            const path = ch.path || '';
            const rawData = ch.data || res.data.pages || res.data.images || [];

            const urls = rawData.map(img => {
                if (!img || typeof img !== 'string') return '';
                if (img.startsWith('/api/') || img.startsWith('data:')) {
                    return img;
                }
                const fullUrl = img.startsWith('http') ? img : `${base}${path}${img}`;
                return `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`;
            });

            console.log(`[Prefetch] Sequential prefetch started for ${urls.length} images of chapter ${nextId}`);
            
            for (const url of urls) {
                if (session !== activePrefetchSession) {
                    console.log('[Prefetch] Prefetch session superseded. Aborting.');
                    break;
                }

                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = url;
                });

                // Small resting delay to completely keep the CPU and network pipes responsive
                await new Promise(r => setTimeout(r, 150));
            }

            if (session === activePrefetchSession) {
                console.log(`[Prefetch] Finished prefetching all images for chapter ${nextId}`);
            }
        }
    } catch (err) {
        console.error('[Prefetch] Background prefetch failed:', err);
    }
};

// --- FULL MANGA CHAPTER BACKGROUND SYNC ENGINE ---
let activeMangaSyncSession = 0;

const triggerMangaFullSync = async (mangaId, chaptersList) => {
    if (!mangaId || !chaptersList || chaptersList.length === 0) return;
    
    activeMangaSyncSession++;
    const currentSession = activeMangaSyncSession;

    // Cooldown of 5 seconds to wait for initial page load and immediate next-chapter prefetch to complete
    await new Promise(r => setTimeout(r, 5000));
    if (currentSession !== activeMangaSyncSession) return;

    console.log(`[MangaSync] Initiating silent full-manga sync for series: ${mangaId}. Total chapters: ${chaptersList.length}`);

    // Map chapters to get clean ID list.
    // Let's sort them so chapters near the current chapter are prioritized!
    const currentChIndex = chaptersList.findIndex(ch => {
        const id = ch.chapter_id || ch.id;
        return String(id) === String(chapterId.value);
    });

    const sortedChapters = [...chaptersList];
    if (currentChIndex !== -1) {
        // Sort based on distance from current chapter index
        sortedChapters.sort((a, b) => {
            const idxA = chaptersList.indexOf(a);
            const idxB = chaptersList.indexOf(b);
            const distA = Math.abs(idxA - currentChIndex);
            const distB = Math.abs(idxB - currentChIndex);
            return distA - distB;
        });
    }

    for (const chapter of sortedChapters) {
        if (currentSession !== activeMangaSyncSession) {
            console.log('[MangaSync] Manga sync session superseded. Aborting full series sync.');
            return;
        }

        const chId = chapter.chapter_id || chapter.id;
        if (!chId) continue;

        try {
            console.log(`[MangaSync] Syncing chapter details for ID: ${chId}`);
            const res = await API.getChapter(chId, PRIORITY.LOW);
            if (currentSession !== activeMangaSyncSession) return;

            if (res?.data) {
                const ch = res.data.chapter || res.data.data?.chapter;
                if (!ch) continue;

                const base = res.data.base_url || res.data.base_image_url || '';
                const path = ch.path || '';
                const rawData = ch.data || res.data.pages || res.data.images || [];

                const urls = rawData.map(img => {
                    if (!img || typeof img !== 'string') return '';
                    if (img.startsWith('/api/') || img.startsWith('data:')) {
                        return img;
                    }
                    const fullUrl = img.startsWith('http') ? img : `${base}${path}${img}`;
                    return `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`;
                });

                console.log(`[MangaSync] Sequential prefetch started for ${urls.length} images of synced chapter ${chId}`);
                
                for (const url of urls) {
                    if (currentSession !== activeMangaSyncSession) {
                        break;
                    }

                    await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                        img.src = url;
                    });

                    // Generous 250ms cooling delay per image to keep system completely responsive and lag-free
                    await new Promise(r => setTimeout(r, 250));
                }
            }
        } catch (err) {
            console.error(`[MangaSync] Sync failed for chapter ${chId}:`, err);
        }

        // Generous 1000ms delay between chapters to avoid overloading network/disk IO
        await new Promise(r => setTimeout(r, 1000));
    }

    if (currentSession === activeMangaSyncSession) {
        console.log(`[MangaSync] Completed full sync archive for series: ${mangaId}`);
    }
};

watch(nextChapter, (newNext) => {
    if (newNext) {
        const nextId = newNext.chapter_id || newNext.id;
        if (nextId) {
            triggerNextChapterPrefetch(nextId);
        }
    }
}, { immediate: true });

onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
});
onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});
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
           :style="{ 
               gap: settings.gap + 'px'
           }">

        <div v-if="isLoading" class="reader-state-msg">
            <div class="loading-spinner"></div>
            <p>UNROLLING MANUSCRIPT...</p>
        </div>

        <div v-else-if="images.length === 0" class="reader-state-msg">
            <p>NO IMAGES FOUND IN THIS RECORD.</p>
            <button @click="loadChapter" class="retry-btn">RETRY EXTRACTION</button>
        </div>

        <div v-else v-for="(src, i) in images" :key="src" class="img-wrap">
          <div class="panel-container" @click="e => addAnnotation(e, i)">
            <img :src="src"
                 class="reader-img"
                 loading="lazy"
                 decoding="async"
                 :style="{ marginBottom: settings.readingMode === 'long-strip' ? settings.gap + 'px' : 0 }"
                 @error="e => e.target.style.display = 'none'">

            <!-- Annotations Layer -->
            <svg class="annotations-overlay">
                <!-- Historical Reader Ghost Marks (Weathering Accumulator) -->
                <circle v-for="ghost in getGhostMarks(i)"
                        :key="ghost.key"
                        :cx="ghost.cx"
                        :cy="ghost.cy"
                        :r="ghost.r"
                        :style="{ opacity: ghost.opacity }"
                        class="ghost-mark" />

                <!-- User Marks -->
                <circle v-for="mark in annotations[`${chapterId}_${i}`]"
                        :key="mark.timestamp"
                        :cx="mark.x + '%'"
                        :cy="mark.y + '%'"
                        r="5"
                        class="ink-mark" />
            </svg>
          </div>
          <div v-if="settings.readingMode !== 'long-strip'" class="page-label">PG {{ i + 1 }}</div>
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
        @hide-ui="uiVisible = false"
        @navigate="dir => navigateTo(dir === 'prev' ? prevChapter : nextChapter, dir === 'prev' ? 'left' : 'right')"
        @jump="jumpToPage"
        @select-chapter="ch => navigateTo(ch, parseFloat(ch.chapter_number) > parseFloat(chapterNumber) ? 'right' : 'left')"
      />

      <!-- Transition Banner Brutalist -->
      <transition name="slide-banner">
        <div v-if="showBanner" class="nav-banner comic-panel" :class="bannerDirection">
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
  position: relative;
}

.reader-state-msg {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 2rem;
    font-weight: 900;
    letter-spacing: 4px;
    color: var(--text-secondary);
}

.loading-spinner {
    width: 60px;
    height: 60px;
    border: 6px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.retry-btn {
    background: var(--accent);
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 8px 8px 0 var(--border);
}

.reader-container.long-strip { width: 100%; }

.reader-img {
  display: block;
  max-width: 100vw;
  height: auto;
  border-radius: 0;
}

.img-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
    overflow: visible;
}

.panel-container {
    position: relative;
    cursor: crosshair;
    display: flex;
    justify-content: center;
}

.annotations-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
}

.ink-mark {
    fill: var(--red);
    opacity: 0.6;
    filter: blur(1px);
    mix-blend-mode: multiply;
}

.ghost-mark {
    fill: var(--red);
    filter: blur(1.5px);
    mix-blend-mode: multiply;
}

/* For reader we don't want massive shadows per image unless spaced out */
.reader-container.long-strip .reader-img {
    box-shadow: none; border: none; border-bottom: var(--border-w) solid var(--border);
}

.fit.width .reader-img { width: 100%; max-width: 900px; margin: 0 auto; }
.fit.height .reader-img { height: 95vh; width: auto; max-width: 100vw; object-fit: contain; }
.fit.original .reader-img { width: auto; max-width: 100vw; }

.nav-banner {
  position: fixed;
  top: 50%;
  background: var(--yellow);
  color: var(--text);
  padding: 1.5rem 3rem;
  font-size: 2rem;
  font-weight: 900;
  z-index: 5000;
  pointer-events: none;
  text-transform: uppercase;
}

.nav-banner.right { right: 10%; transform: translateY(-50%); }
.nav-banner.left { left: 10%; transform: translateY(-50%); }

.slide-banner-enter-active, .slide-banner-leave-active {
  transition: opacity 0.15s ease;
}
.slide-banner-enter-from, .slide-banner-leave-to {
  opacity: 0;
}

.loader-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  z-index: 9999;
}

.page-label {
    text-align: center;
    padding: 1rem;
    color: var(--text-secondary);
    font-weight: 900;
}

</style>

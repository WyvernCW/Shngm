<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { API } from '../api';
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


const MATERIAL_PROFILES = {
    default: { inkSpeed: '1.2s', filter: 'none', breakoutMult: 1.0 },
    Horror: { inkSpeed: '3s', filter: 'grayscale(1) contrast(1.5) brightness(0.8)', breakoutMult: 1.5 },
    Action: { inkSpeed: '0.8s', filter: 'saturate(1.5) contrast(1.2)', breakoutMult: 1.2 },
    Comedy: { inkSpeed: '0.5s', filter: 'sepia(0.2) brightness(1.1)', breakoutMult: 0.8 },
    Romance: { inkSpeed: '2s', filter: 'hue-rotate(340deg) saturate(1.2)', breakoutMult: 0.7 }
};

const currentProfile = computed(() => {
    const genres = seriesDetail.value?.taxonomy?.Genre || [];
    for (const g of genres) {
        if (MATERIAL_PROFILES[g.name]) return MATERIAL_PROFILES[g.name];
    }
    return MATERIAL_PROFILES.default;
});

const loadChapter = async () => {
    isLoading.value = true;
    libraryUpdated.value = false;
    currentPage.value = 1;

    try {
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
                } else {
                    updateLibrary();
                }
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        isLoading.value = false;
        window.scrollTo(0, 0);
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
            coverUrl: getCoverUrl(seriesDetail.value),
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
    const ch = chapterData.value?.chapter || chapterData.value?.data?.chapter;
    if (!ch) return [];
    
    const base = chapterData.value.base_url || chapterData.value.base_image_url || '';
    const path = ch.path || '';
    const rawData = ch.data || chapterData.value.pages || chapterData.value.images || [];

    return rawData.map(img => {
        const fullUrl = img.startsWith('http') ? img : `${base}${path}${img}`;
        // Wrap shinigami images in proxy
        if (fullUrl.includes('shngm.id') || fullUrl.includes('shinigami.id') || fullUrl.includes('assets.shngm.id')) {
            return `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`;
        }
        return fullUrl;
    });
});

// SHARED HISTORY: Simulated Ghosts of other readers
const sharedGhosts = computed(() => {
    if (!chapterId.value || !images.value.length) return {};
    const ghosts = {};
    
    // Seeded random for deterministic marks
    const seed = (str) => {
        let h = 0;
        for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        return h;
    };

    const s = seed(chapterId.value);
    
    images.value.forEach((_, i) => {
        const key = `${chapterId.value}_${i}`;
        const pageSeed = s + i;
        const markCount = (Math.abs(pageSeed) % 4) + 1; // 1-4 ghosts per page
        
        ghosts[key] = Array.from({ length: markCount }).map((_, j) => {
            const mSeed = pageSeed + j * 100;
            return {
                x: (Math.abs(Math.sin(mSeed)) * 80) + 10, // 10-90%
                y: (Math.abs(Math.cos(mSeed)) * 80) + 10,
                opacity: (Math.abs(Math.sin(mSeed * 2)) * 0.15) + 0.05 // Very faint
            };
        });
    });
    
    return ghosts;
});

const handleScroll = () => {
    const imgs = document.querySelectorAll('.reader-img');
    let current = 1;
    imgs.forEach((img, i) => {
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2) current = i + 1;
    });
    currentPage.value = current;

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

onMounted(() => { window.addEventListener('scroll', handleScroll, { passive: true }); });
onUnmounted(() => { window.removeEventListener('scroll', handleScroll); });

const updateSettings = (newVal) => {
    settings.value = { ...newVal };
    localStorage.setItem('vrtwel_mode', newVal.readingMode);
    localStorage.setItem('vrtwel_bg', newVal.bg);
    localStorage.setItem('vrtwel_fit', newVal.fit);
    localStorage.setItem('vrtwel_gap', newVal.gap);
    localStorage.setItem('vrtwel_autoadvance', newVal.autoAdvance);
};

// V-BLEED DIRECTIVE: Ink-Bleed Transition logic
const vBleed = {
    mounted(el) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Slight delay for smoother ink feel
                    setTimeout(() => {
                        el.classList.add('bleeding');
                    }, 100);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.05 });
        observer.observe(el);
        
        // Immediate check
        requestAnimationFrame(() => {
            if (el.getBoundingClientRect().top < window.innerHeight) {
                el.classList.add('bleeding');
            }
        });
    }
};

// BREAKOUT MODE: 3D Scroll Listener
const handleBreakout = () => {
    const panels = document.querySelectorAll('.breakout-panel');
    const centerY = window.innerHeight / 2;
    let maxZ = 0;
    
    panels.forEach(panel => {
        const rect = panel.getBoundingClientRect();
        const distFromCenter = rect.top + rect.height / 2 - centerY;
        const normalizedDist = distFromCenter / centerY;
        
        if (Math.abs(normalizedDist) < 1.5) {
            const z = Math.max(0, (1 - Math.abs(normalizedDist)) * 80); // Reduced Z to avoid clipping
            const rotX = normalizedDist * 8;
            const rotY = -normalizedDist * 4;
            panel.style.transform = `translateZ(${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${1 + z/2000})`;
            panel.style.zIndex = Math.round(z);
            if (z > maxZ) maxZ = z;
        } else {
            panel.style.transform = 'none';
        }
    });
};

// Ribbon Logic
const scrollPercent = ref(0);
const handleScrollSync = () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    scrollPercent.value = height > 0 ? (winScroll / height) * 100 : 0;
    handleScroll();
    handleBreakout();
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

onMounted(() => {
    window.addEventListener('scroll', handleScrollSync, { passive: true });
});
onUnmounted(() => {
    window.removeEventListener('scroll', handleScrollSync);
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
               gap: settings.gap + 'px',
               '--bleed-speed': (currentProfile?.inkSpeed) || '1.2s',
               '--material-filter': (currentProfile?.filter) || 'none',
               '--paper-opacity': ((currentProfile?.breakoutMult || 1.0) * 0.05 + 0.05)
           }">
        
        <!-- Paper Texture Overlay -->
        <div class="reader-paper-grain"></div>

        <div v-if="isLoading" class="reader-state-msg">
            <div class="loading-spinner"></div>
            <p>UNROLLING MANUSCRIPT...</p>
        </div>

        <div v-else-if="images.length === 0" class="reader-state-msg">
            <p>NO IMAGES FOUND IN THIS RECORD.</p>
            <button @click="loadChapter" class="retry-btn">RETRY EXTRACTION</button>
        </div>

        <div v-else v-for="(src, i) in images" :key="src" class="img-wrap" v-bleed>
          <div class="panel-container" @click="e => addAnnotation(e, i)">
            <img :src="src" 
                 class="reader-img comic-panel breakout-panel" 
                 loading="lazy"
                 :style="{ marginBottom: settings.readingMode === 'long-strip' ? settings.gap + 'px' : 0 }"
                 @error="e => e.target.style.display = 'none'">
            
            <!-- Annotations & Ghosts Layer -->
            <svg class="annotations-overlay">
                <!-- Shared Ghosts (Others) -->
                <circle v-for="(ghost, gi) in sharedGhosts[`${chapterId}_${i}`]" 
                        :key="'ghost_'+gi"
                        :cx="ghost.x + '%'" 
                        :cy="ghost.y + '%'" 
                        r="8" 
                        class="ghost-mark"
                        :style="{ opacity: ghost.opacity }" />

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

      <!-- Tactile Scroll Ribbon -->
      <div class="scroll-ribbon-container" :style="{ '--scroll': scrollPercent + '%' }">
        <svg viewBox="0 0 40 400" class="scroll-ribbon">
            <path d="M20,0 Q30,100 20,200 T20,400" class="ribbon-path" />
            <circle cx="20" :cy="4 * scrollPercent" r="8" class="ribbon-handle" />
        </svg>
      </div>

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
  perspective: 2000px;
  transform-style: preserve-3d;
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

.reader-paper-grain {
    position: fixed;
    inset: 0;
    background-image: url('https://www.transparenttextures.com/patterns/paper-fibers.png');
    opacity: var(--paper-opacity, 0.1);
    pointer-events: none;
    z-index: 10;
}

.ghost-mark {
    fill: var(--text-secondary);
    pointer-events: none;
    mix-blend-mode: multiply;
}

.reader-container.long-strip { width: 100%; }

.reader-img {
  display: block;
  max-width: 100vw;
  height: auto;
  border-radius: 0;
  transition: transform 0.1s linear, mask-size 1.2s ease-out;
  backface-visibility: hidden;
}

/* Ink-Bleed Transition Styles */
.img-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
    overflow: visible;
    /* Default: Invisible until bleeding triggers */
    mask-image: radial-gradient(circle, #000 100%, transparent 100%);
    mask-size: 0% 0%;
    mask-repeat: no-repeat;
    mask-position: center;
    transition: mask-size 1.2s cubic-bezier(0.19, 1, 0.22, 1);
    opacity: 0;
}

.img-wrap.bleeding {
    mask-size: 400% 400%;
    opacity: 1;
}

/* Breakout Mode Styling */
.breakout-panel {
    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.05);
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
    animation: inkBleed 0.5s ease-out forwards;
}

@keyframes inkBleed {
    from { r: 0; opacity: 0; }
    to { r: 6; opacity: 0.6; }
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
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-banner-enter-from { opacity: 0; transform: translateY(-50%) scale(0.8) translateX(100px); }
.slide-banner-leave-to { opacity: 0; transform: translateY(-50%) scale(0.8) translateX(-100px); }

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

/* Scroll Ribbon Styles */
.scroll-ribbon-container {
    position: fixed;
    right: 2rem;
    top: 50%;
    transform: translateY(-50%);
    height: 400px;
    width: 40px;
    z-index: 5000;
    pointer-events: none;
}

.scroll-ribbon {
    width: 100%;
    height: 100%;
    overflow: visible;
}

.ribbon-path {
    fill: none;
    stroke: var(--accent);
    stroke-width: 4;
    stroke-linecap: round;
    opacity: 0.2;
}

.ribbon-handle {
    fill: var(--accent);
    filter: drop-shadow(0 0 10px var(--accent));
    transition: cy 0.1s linear;
}

@media (max-width: 800px) {
    .scroll-ribbon-container { display: none; }
}
</style>

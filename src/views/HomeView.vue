<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { API } from '../api.js';
import MangaCard from '../components/MangaCard.vue';

const latestManga = ref([]);
const mwdManga = ref([]);
const trendingManga = ref([]);
const genres = ref([]);
const isLoading = ref(true);

const continueReading = ref([]);
const featuredIdx = ref(0);
let featTimer;

const getFallbackDate = (m) => {
    // Strictly prioritize the actual chapter date to avoid fake freshness from series metadata
    return m.real_updated_at || null;
};

const formatTimeShort = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return ''; 

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 1000 / 60);
    const diffHours = Math.floor(diffMs / 1000 / 3600);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return 'FRESH';
    if (diffHours < 5) return 'FRESH';
    if (diffHours < 24) return `${diffHours}H`;
    if (diffDays < 7) return `${diffDays}D`;
    return `${Math.floor(diffDays / 7)}W`;
};

const loadData = async () => {
    isLoading.value = true;
    try {
        const h = JSON.parse(localStorage.getItem('vrtwel_library') || '[]');
        continueReading.value = h.slice(0, 6);
    } catch {}

    try {
        const [latest, trending, mwd] = await Promise.allSettled([
            API.getLatest(1, 12),
            API.getTrending('daily', 12),
            API.mwd.getLatest(1).catch(() => ({ data: [] }))
        ]);

        latestManga.value = latest.status === 'fulfilled' ? latest.value?.data || [] : [];
        trendingManga.value = trending.status === 'fulfilled' ? trending.value?.data || [] : [];
        mwdManga.value = mwd.status === 'fulfilled' ? mwd.value?.data || [] : [];

        // Background update for real dates on all sections
        (async () => {
            const allLists = [latestManga.value, trendingManga.value, mwdManga.value];
            for (const list of allLists) {
                for (let i = 0; i < list.length; i++) {
                    const m = list[i];
                    if (!m?.manga_id) continue;
                    try {
                        const chRes = await API.getChapterList(m.manga_id);
                        const chapters = chRes?.data || [];
                        const latestCh = chapters[0];
                        const realDate = latestCh?.release_date || latestCh?.created_at;
                        if (realDate) {
                            list[i].real_updated_at = realDate;
                        }
                    } catch (e) {}
                }
            }
        })();



        const gSet = new Set();
        latestManga.value.forEach(m => {
            m.taxonomy?.Genre?.forEach(g => gSet.add(JSON.stringify(g)));
        });
        genres.value = Array.from(gSet).map(g => JSON.parse(g)).sort((a,b) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error('HomeView loadData Error:', e);
    } finally {
        isLoading.value = false;
    }

    featTimer = setInterval(() => {
        if (latestManga.value.length > 0) {
            featuredIdx.value = (featuredIdx.value + 1) % Math.min(latestManga.value.length, 5);
        }
    }, 6000);
};


onMounted(loadData);
onUnmounted(() => {
    if (featTimer) clearInterval(featTimer);
});

const resolveImg = (m) => API.resolveImg(m);
</script>

<template>
  <div class="home-view">

    <!-- Hero Banner Comic Panel -->
    <section v-if="latestManga.length > 0" class="home-section hero-section">
      
      <div class="comic-panel hero-panel">
        <div class="hero-layout">
          <!-- Left Content -->
          <div class="hero-content">
            <div class="hero-badge">SPOTLIGHT</div>
            <transition name="pop" mode="out-in">
              <h1 :key="featuredIdx" class="hero-title">{{ latestManga[featuredIdx].title }}</h1>
            </transition>
            
            <div class="hero-actions">
              <a :href="`#/series/${latestManga[featuredIdx].manga_id}`" class="comic-button">
                READ NOW!
              </a>
              <a :href="`#/series/${latestManga[featuredIdx].manga_id}`" class="comic-button secondary">
                INFO
              </a>
            </div>

            <div class="hero-nav">
              <div v-for="(m, i) in latestManga.slice(0, 5)" :key="i"
                   class="nav-box" :class="{ active: i === featuredIdx }"
                   @click="featuredIdx = i"></div>
            </div>
          </div>
          
          <!-- Right Image with comic halftone effect behind it -->
          <div class="hero-poster-container">
            <transition name="slide-left" mode="out-in">
              <img :key="featuredIdx" :src="resolveImg(latestManga[featuredIdx])" class="hero-img comic-panel" />
            </transition>
          </div>
        </div>
      </div>
    </section>

    <!-- Continue Reading -->
    <section v-if="trendingManga.length" class="home-section">
      <div class="section-header">
        <h2 class="section-title">RESUME READING</h2>
      </div>
      <div class="continue-scroll">
        <a v-for="(item, i) in continueReading" :key="item.id"
           :href="`#/series/${item.mangaId || item.id}`" class="continue-card comic-panel">
          <img :src="item.coverUrl || item.cover" class="continue-cover" />
          <div class="continue-info">
            <span class="continue-title">{{ item.mangaTitle || item.title }}</span>
            <span class="continue-ch">CH. {{ item.chapterNumber || item.chapter }}</span>
          </div>
        </a>
      </div>
    </section>

    <!-- Latest Updates -->
    <section class="home-section">
      <div class="section-header">
        <h2 class="section-title">NEW ISSUES</h2>
        <a href="#/all" class="view-all comic-button secondary" style="padding: 6px 12px; font-size: 0.8rem;">SEE ALL</a>
      </div>
      <div v-if="isLoading" class="grid-skeleton">
        <div v-for="i in 12" :key="i" class="skeleton-card"></div>
      </div>
      <div v-else class="manga-grid">
        <MangaCard
          v-for="(m, i) in latestManga" :key="m.manga_id"
          :index="i"
          :title="m.title"
          :coverUrl="resolveImg(m)"
          :latestChapter="m.latest_chapter_number"
          :rating="m.user_rate"
          :type="m.taxonomy?.Format?.[0]?.name"
          :href="`#/series/${m.manga_id}`"
          :isNew="getFallbackDate(m) ? (Date.now() - new Date(getFallbackDate(m)).getTime()) < 18000000 : false"
          :status="getFallbackDate(m) ? formatTimeShort(getFallbackDate(m)) : null"
          :showStatusBadges="true"
        />
      </div>
    </section>

    <!-- Trending -->
    <section v-if="trendingManga.length" class="home-section">
      <div class="section-header">
        <h2 class="section-title">HOT SERIES</h2>
      </div>
      <div class="trending-scroll">
        <a v-for="(m, index) in trendingManga" :key="m.manga_id" :href="`#/series/${m.manga_id}`" class="trending-card comic-panel">
          <div class="trending-rank">#{{ index + 1 }}</div>
          <div class="trending-img-wrap">
            <img :src="resolveImg(m)" class="trending-img" loading="lazy" />
          </div>
          <div class="trending-info">
            <span class="trending-title">{{ m.title }}</span>
          </div>
        </a>
      </div>
    </section>

    <!-- Genre Browse -->
    <section class="home-section">
      <div class="section-header">
        <h2 class="section-title">GENRES</h2>
      </div>
      <div class="genre-grid">
        <a v-for="g in genres.slice(0, 12)" :key="g.slug"
           :href="`#/all?genre=${g.slug}`" class="genre-card comic-panel">
          {{ g.name.toUpperCase() }}
        </a>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home-view { padding-bottom: 2rem; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: var(--border-w) solid var(--border);
  padding-bottom: 0.5rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
}

/* Hero Panel Brutalist */
.hero-panel {
  padding: 3rem;
  background: var(--yellow);
  margin-bottom: 3rem;
  overflow: hidden;
  position: relative;
}

/* Halftone inside hero */
.hero-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(var(--border) 1.5px, transparent 1.5px);
    background-size: 16px 16px;
    opacity: 0.2;
    z-index: 0;
    pointer-events: none;
}

.hero-layout {
  display: flex;
  align-items: center;
  gap: 4rem;
  position: relative;
  z-index: 1;
}

.hero-content {
  flex: 1;
  max-width: 600px;
}

.hero-badge {
  display: inline-block;
  background: var(--border);
  color: white;
  font-weight: 900;
  padding: 6px 12px;
  font-size: 0.8rem;
  letter-spacing: 1px;
  margin-bottom: 1rem;
}

.hero-title {
  font-size: 4rem;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: -2px;
  margin-bottom: 2rem;
  color: var(--text);
  /* Text shadow for pop effect */
  text-shadow: 4px 4px 0px var(--surface), 6px 6px 0px var(--border);
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}

.hero-nav {
  display: flex;
  gap: 8px;
}

.nav-box {
  width: 24px;
  height: 8px;
  background: var(--surface);
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-box.active {
  background: var(--accent);
  width: 48px;
}

.hero-poster-container {
  width: 260px;
  flex-shrink: 0;
  position: relative;
  transform: rotate(3deg);
}

.hero-img {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
}

/* Transitions */
.pop-enter-active, .pop-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pop-enter-from { opacity: 0; transform: scale(0.9) translateY(20px); }
.pop-leave-to { opacity: 0; transform: scale(1.1) translateY(-20px); }

.slide-left-enter-active, .slide-left-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.slide-left-enter-from { opacity: 0; transform: translateX(50px) rotate(10deg); }
.slide-left-leave-to { opacity: 0; transform: translateX(-50px) rotate(-10deg); }


/* Continue Reading Custom */
.continue-scroll {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding: 0.5rem 0 1.5rem;
  scrollbar-width: none;
}

.continue-scroll::-webkit-scrollbar { display: none; }

.continue-card {
  display: flex;
  align-items: stretch;
  width: 240px;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
}

.continue-cover {
  width: 80px;
  object-fit: cover;
  border-right: var(--border-w) solid var(--border);
}

.continue-info { 
  flex: 1; 
  padding: 12px; 
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.continue-title {
  font-weight: 900;
  font-size: 1rem;
  line-height: 1.1;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.continue-ch {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent);
}

/* Trending custom */
.trending-scroll {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding: 0.5rem 0 1.5rem;
  scrollbar-width: none;
}

.trending-scroll::-webkit-scrollbar { display: none; }

.trending-card {
  flex-shrink: 0;
  width: 280px;
  display: flex;
  align-items: center;
  padding: 0;
  overflow: hidden;
  background: var(--blue);
  color: white;
}

.trending-card:hover {
  background: var(--accent);
}

.trending-rank {
  font-size: 2.5rem;
  font-weight: 900;
  padding: 0 1rem;
  -webkit-text-stroke: 2px var(--border);
  color: transparent;
}

.trending-img-wrap {
  width: 80px;
  height: 100px;
  border-left: var(--border-w) solid var(--border);
  border-right: var(--border-w) solid var(--border);
  flex-shrink: 0;
}

.trending-img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(100%) contrast(1.5); transition: 0.3s; }
.trending-card:hover .trending-img { filter: grayscale(0%) contrast(1.1); }

.trending-info { flex: 1; padding: 0 1rem; }

.trending-title {
  display: block;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Genre Grid */
.genre-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.genre-card {
  padding: 16px;
  text-align: center;
  font-weight: 900;
  font-size: 1rem;
  background: var(--surface);
}

.genre-card:nth-child(even) {
    background: var(--yellow);
}
.genre-card:nth-child(3n) {
    background: var(--blue);
    color: white;
}

.grid-skeleton {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 2rem;
}
.skeleton-card {
    aspect-ratio: 2/3;
    background: var(--surface);
    border: var(--border-w) solid var(--border);
    animation: pulse 1.5s infinite alternate;
}
@keyframes pulse {
    0% { opacity: 0.5; }
    100% { opacity: 1; }
}

@media (max-width: 1024px) {
  .hero-panel { padding: 2rem; }
  .hero-layout { gap: 2rem; }
  .hero-title { font-size: 3rem; }
  .hero-poster-container { width: 200px; }
}

@media (max-width: 768px) {
  .hero-panel { padding: 1.5rem; margin: -1.5rem -1.5rem 2rem; border-left: none; border-right: none; }
  .hero-layout { flex-direction: column-reverse; text-align: center; }
  .hero-poster-container { width: 180px; transform: rotate(0); margin-bottom: 1rem; }
  .hero-title { font-size: 2.5rem; text-shadow: 2px 2px 0px var(--surface), 4px 4px 0px var(--border); }
  .hero-actions { justify-content: center; flex-wrap: wrap; }
  .hero-nav { justify-content: center; }
}
</style>

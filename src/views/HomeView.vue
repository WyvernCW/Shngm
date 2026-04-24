<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { API } from '../api.js';
import { BookOpen, Zap, Flame, Globe } from 'lucide-vue-next';
import MangaCard from '../components/MangaCard.vue';

const latestManga = ref([]);
const mwdManga = ref([]);
const trendingManga = ref([]);
const genres = ref([]);
const isLoading = ref(true);

const continueReading = ref([]);
const featuredIdx = ref(0);
let featTimer;

const formatTimeShort = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return ''; // Invalid date

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 1000 / 60);
    const diffHours = Math.floor(diffMs / 1000 / 3600);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
};

// Try to get the best available date from manga object
const getMangaDate = (m) => {
    const candidates = [
        m.updated_at,
        m.created_at,
        m.release_date,
        m.latest_chapter_date,
        m.last_updated,
        m.last_updated_at,
        m.publish_date,
        m.date
    ];
    for (const date of candidates) {
        if (date && new Date(date).getTime()) return date;
    }
    return null;
};

const loadData = async () => {
    isLoading.value = true;
    try {
        const h = JSON.parse(localStorage.getItem('vrtwel_history') || '[]');
        continueReading.value = h.slice(0, 6);
    } catch {}

    try {
        const [latest, trending, mwd] = await Promise.allSettled([
            API.getLatest(1, 12),
            API.getTrending('daily', 12),
            API.mwd.getLatest(1)
        ]);

        latestManga.value = latest.status === 'fulfilled' ? latest.value?.data || [] : [];
        trendingManga.value = trending.status === 'fulfilled' ? trending.value?.data || [] : [];
        mwdManga.value = mwd.status === 'fulfilled' ? mwd.value?.data || [] : [];

        // Fetch real update times in background (non-blocking, with caching)
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const CACHE_KEY = 'vrtwel_date_cache';
        const CACHE_TTL = 86400000; // 24 hours
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        const now = Date.now();

        (async () => {
            const mangaWithRealDates = [];
            const newCache = {};
            for (const m of latestManga.value) {
                const cached = cache[m.manga_id];
                if (cached && (now - cached.timestamp) < CACHE_TTL) {
                    mangaWithRealDates.push({ ...m, real_updated_at: cached.date });
                    newCache[m.manga_id] = cached;
                    continue;
                }
                try {
                    await delay(300);
                    let chRes;
                    let retries = 0;
                    while (retries < 2) {
                        try {
                            chRes = await API.getChapterList(m.manga_id);
                            break;
                        } catch (e) {
                            retries++;
                            if (retries < 2) await delay(500 * retries);
                        }
                    }
                    const chapters = chRes?.data || [];
                    const latestCh = chapters[0];
                    const realDate = latestCh?.release_date || latestCh?.created_at;
                    if (realDate) {
                        mangaWithRealDates.push({ ...m, real_updated_at: realDate });
                        newCache[m.manga_id] = { date: realDate, timestamp: now };
                    } else {
                        mangaWithRealDates.push({ ...m, real_updated_at: null });
                    }
                } catch (e) {
                    mangaWithRealDates.push({ ...m, real_updated_at: null });
                }
            }
            latestManga.value = mangaWithRealDates;
            localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
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
            featuredIdx.value = (featuredIdx.value + 1) % Math.min(latestManga.value.length, 3);
        }
    }, 5000);
};

onMounted(loadData);
onUnmounted(() => {
    if (featTimer) clearInterval(featTimer);
});

const resolveImg = (m) => API.resolveImg(m);
</script>

<template>
  <div class="home-view animate">

    <!-- Continue Reading -->
    <section v-if="continueReading.length" class="home-section">
      <div class="section-header">
        <h2 class="section-title"><BookOpen :size="20" /> Continue Reading</h2>
      </div>
      <div class="continue-scroll">
        <a v-for="item in continueReading" :key="item.id"
           :href="`#/series/${item.id}`" class="continue-card">
          <img :src="item.cover" class="continue-cover" />
          <div class="continue-info">
            <span class="continue-title">{{ item.title }}</span>
            <span class="continue-ch">CH.{{ item.chapter }}</span>
            <div class="continue-bar">
              <div class="continue-fill" :style="`width:${item.progress || 0}%`"></div>
            </div>
          </div>
        </a>
      </div>
    </section>

    <!-- Featured Banner -->
    <section v-if="latestManga.length > 0" class="home-section">
      <div class="hero-banner">
        <div class="hero-bg" :style="{ backgroundImage: `url(${resolveImg(latestManga[featuredIdx])})` }"></div>
        <div class="hero-overlay">
          <div class="hero-left">
            <div class="featured-badge">● FEATURED</div>
            <h1 class="hero-title">{{ latestManga[featuredIdx].title }}</h1>
            <div class="hero-genres">
              <span v-for="g in latestManga[featuredIdx].taxonomy?.Genre?.slice(0, 3)" :key="g.slug" class="genre-pill">
                {{ g.name }}
              </span>
            </div>
            <a :href="`#/series/${latestManga[featuredIdx].manga_id}`" class="btn-primary hero-btn">Start Reading</a>

            <div class="feat-dot-row">
              <div v-for="(m, i) in latestManga.slice(0, Math.min(latestManga.length, 3))" :key="i"
                   class="feat-dot" :class="{ active: i === featuredIdx }"
                   @click="featuredIdx = i"></div>
            </div>
          </div>
          <div class="hero-right">
            <img :src="resolveImg(latestManga[featuredIdx])" class="hero-cover" />
          </div>
        </div>
      </div>
    </section>

    <div v-else-if="isLoading" class="hero-banner loading">
      <div class="loader"></div>
    </div>

    <!-- Latest Updates -->
    <section class="home-section">
      <div class="section-header">
        <h2 class="section-title"><Zap :size="20" class="text-accent" /> Latest Updates</h2>
        <a href="#/all" class="view-all">View All →</a>
      </div>
      <div v-if="isLoading" class="grid-skeleton">
        <div v-for="i in 6" :key="i" class="skeleton-card"></div>
      </div>
      <div v-else class="manga-grid">
        <MangaCard
          v-for="m in latestManga" :key="m.manga_id"
          :title="m.title"
          :coverUrl="resolveImg(m)"
          :latestChapter="m.latest_chapter_number"
          :rating="m.user_rate"
          :type="m.taxonomy?.Format?.[0]?.name"
          :href="`#/series/${m.manga_id}`"
          :isNew="m.real_updated_at ? (Date.now() - new Date(m.real_updated_at).getTime()) < 86400000 : false"
          :status="m.real_updated_at ? formatTimeShort(m.real_updated_at) : null"
          :showStatusBadges="true"
        />
      </div>
    </section>

    <!-- Trending -->
    <section v-if="trendingManga.length" class="home-section">
      <div class="section-header">
        <h2 class="section-title"><Flame :size="20" class="text-orange" /> Trending Today</h2>
      </div>
      <div class="h-scroll-row">
        <a v-for="(m, index) in trendingManga" :key="m.manga_id" :href="`#/series/${m.manga_id}`" class="h-card">
          <div class="h-card-img-wrap">
            <img :src="resolveImg(m)" class="h-card-img" loading="lazy" @error="e => e.target.src = '/assets/covers/standard.svg'" />
            <span class="h-rank">{{ index + 1 }}</span>
          </div>
          <span class="h-card-title">{{ m.title }}</span>
        </a>
      </div>
    </section>

    <!-- Genre Browse -->
    <section class="home-section genre-section">
      <h2 class="section-title" style="margin-bottom: 1.5rem;">Browse by Genre</h2>
      <div class="genre-row">
        <a v-for="g in genres" :key="g.slug"
           :href="`#/all?genre=${g.slug}`" class="genre-item">
          {{ g.name }}
        </a>
      </div>
    </section>

    <!-- Manhwadesu Section -->
    <section class="home-section mwd-section">
      <div class="section-header">
        <h2 class="section-title">
          <Globe :size="20" class="text-purple" /> From Manhwadesu
          <span class="source-tag">MWD</span>
        </h2>
      </div>
      <div class="h-scroll-row">
        <a v-for="m in mwdManga" :key="m.manga_id" :href="`#/series/mwd-${m.manga_id}`" class="h-card">
          <div class="h-card-img-wrap">
            <img :src="resolveImg(m)" class="h-card-img" loading="lazy" @error="e => e.target.src = '/assets/covers/standard.svg'" />
          </div>
          <span class="h-card-title">{{ m.title }}</span>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view { padding-bottom: 5rem; }

/* Hero Banner */
.hero-banner {
  height: 360px;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  margin-bottom: 3.5rem;
  border: 1px solid var(--border);
}
.hero-banner.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--card-bg);
}
.hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center top;
  filter: blur(20px) brightness(0.3);
  transform: scale(1.05);
  transition: background-image 0.4s ease;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(10,9,8,0.97) 40%, rgba(10,9,8,0.3));
  padding: 2.5rem 3rem;
  display: flex;
  align-items: center;
  gap: 3rem;
}
.hero-left { flex: 1; }
.hero-right { flex-shrink: 0; width: 140px; }
.hero-cover {
  width: 140px;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  border: 1px solid var(--border);
}
.featured-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent);
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 2px;
  margin-bottom: 0.5rem;
}
.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 0.5rem;
  color: #fff;
}
.hero-genres {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.hero-genres .genre-pill {
  background: rgba(255,255,255,0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #fff;
}
.hero-btn {
  text-decoration: none;
  display: inline-flex;
}
.feat-dot-row { display: flex; gap: 6px; margin-top: 1.5rem; }
.feat-dot {
  width: 6px; height: 6px;
  border-radius: 99px;
  background: rgba(255,255,255,0.2);
  transition: all 0.3s;
  cursor: pointer;
}
.feat-dot.active { background: var(--accent); width: 18px; }

.home-section { margin-bottom: 4rem; }

.text-cyan { color: var(--cyan); }
.text-accent { color: var(--accent); }
.text-purple { color: #a855f7; }
.text-orange { color: #f97316; }

/* Horizontal Scroll Cards */
.h-scroll-row {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 0.5rem 2px 1.5rem;
  scrollbar-width: none;
}
.h-scroll-row::-webkit-scrollbar { display: none; }
.h-card {
  flex-shrink: 0;
  width: 150px;
  text-decoration: none;
  color: inherit;
}
.h-card-img-wrap {
  position: relative;
  aspect-ratio: 2/3;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.h-card-img { width: 100%; height: 100%; object-fit: cover; }
.h-rank {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 2rem;
  font-weight: 900;
  color: rgba(255,255,255,0.12);
  line-height: 1;
  font-family: 'Outfit', sans-serif;
}
.h-card-title {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #e2e8f0;
}

/* Genre Row */
.genre-row {
  display: flex;
  gap: 0.8rem;
  overflow-x: auto;
  padding: 0.5rem 0;
  scrollbar-width: none;
}
.genre-row::-webkit-scrollbar { display: none; }
.genre-item {
  flex-shrink: 0;
  padding: 0.5rem 1.2rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 99px;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
  text-decoration: none;
}
.genre-item:hover {
  background: rgba(139,92,246,0.12);
  border-color: var(--accent);
  color: var(--accent);
}

/* Source Tag */
.source-tag {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 0.65rem;
  font-weight: 800;
  border: 1px solid rgba(168, 85, 247, 0.2);
  margin-left: 8px;
  vertical-align: middle;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-banner { height: 220px; }
  .hero-overlay { padding: 1.5rem; gap: 1.5rem; }
  .hero-title { font-size: 1.6rem !important; }
  .hero-right { display: none; }
  .hero-genres { flex-wrap: wrap; }
}
</style>

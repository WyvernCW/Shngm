<script setup>
import { ref, onMounted, onActivated, computed } from 'vue';
import { Library, BookOpen, Clock, TrendingUp } from 'lucide-vue-next';
import { API } from '../api.js';
import MangaCard from '../components/MangaCard.vue';

const items = ref([]);
const itemsWithRealDates = ref([]);

const loadLibrary = async () => {
    const saved = localStorage.getItem('vrtwel_library');
    if (saved) {
        try {
            items.value = JSON.parse(saved);
            itemsWithRealDates.value = items.value.map(i => ({ ...i, real_updated_at: null }));

            // Background: parallel freshness via cached engine (map mangaId → manga_id)
            API.getChapterDatesParallel(
                itemsWithRealDates.value.map(i => ({ ...i, manga_id: i.mangaId })),
                (id, date) => {
                    const idx = itemsWithRealDates.value.findIndex(m => m.mangaId === id);
                    if (idx !== -1) itemsWithRealDates.value[idx].real_updated_at = date;
                }
            );

        } catch (err) {
            console.error('[Library] Failed to parse library:', err);
            items.value = [];
        }
    } else {
        items.value = [];
        itemsWithRealDates.value = [];
    }
};

onMounted(loadLibrary);
onActivated(loadLibrary);

const stats = computed(() => {
    const displayItems = itemsWithRealDates.value.length > 0 ? itemsWithRealDates.value : items.value;
    if (displayItems.length === 0) return null;

    const totalChapters = displayItems.reduce((sum, item) => sum + (parseInt(item.chapterNumber) || 0), 0);
    const totalSeries = displayItems.length;
    const avgProgress = displayItems.reduce((sum, item) => {
        if (item.totalChapters && item.chapterNumber) {
            return sum + (parseInt(item.chapterNumber) / parseInt(item.totalChapters));
        }
        return sum;
    }, 0) / totalSeries * 100;

    const timestamps = displayItems.map(i => i.timestamp).sort((a, b) => b - a);
    let streak = 0;
    if (timestamps.length > 0) {
        const today = new Date().setHours(0, 0, 0, 0);
        const lastRead = new Date(timestamps[0]).setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - lastRead) / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
            streak = 1;
            for (let i = 1; i < timestamps.length; i++) {
                const current = new Date(timestamps[i]).setHours(0, 0, 0, 0);
                const prev = new Date(timestamps[i - 1]).setHours(0, 0, 0, 0);
                if (Math.floor((prev - current) / (1000 * 60 * 60 * 24)) === 1) {
                    streak++;
                } else if (prev !== current) {
                    break;
                }
            }
        }
    }

    return {
        totalSeries,
        totalChapters,
        avgProgress: Math.round(avgProgress) || 0,
        streak
    };
});

const formatTimeShort = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
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

const isRecentlyUpdated = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const now = Date.now();
    return (now - date.getTime()) < 18000000;
};

const calculateProgress = (item) => {
    if (!item.totalChapters || !item.chapterNumber) return 0;
    const progress = (parseInt(item.chapterNumber) / parseInt(item.totalChapters)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};

const getFallbackDate = (m) => {
    return m.real_updated_at || m.updated_at || m.timestamp || null;
};

const selectedManga = ref(null);
const fullChapterList = ref([]);
const isLoadingChapters = ref(false);

const selectManga = async (m) => {
    selectedManga.value = m;
    isLoadingChapters.value = true;
    try {
        const res = await API.getChapterList(m.mangaId);
        const history = JSON.parse(localStorage.getItem('vrtwel_history') || '{}');
        const readIds = history[m.mangaId] || [];
        
        // FILTER: Only show read chapters
        fullChapterList.value = (res.data || []).filter(ch => 
            readIds.includes(String(ch.chapter_number)) || String(ch.chapter_number) === String(m.chapterNumber)
        );
    } catch (e) {
        console.error('Failed to load history:', e);
    } finally {
        isLoadingChapters.value = false;
    }
};

const closeFocus = () => {
    selectedManga.value = null;
    fullChapterList.value = [];
};
</script>

<template>
  <div class="library-view">
    
    <div class="page-header">
      <h2 class="section-title">MY STASH</h2>
    </div>

    <!-- Reading Stats Comic Style -->
    <div v-if="stats" class="stats-section">
      <div class="stat-card comic-panel" style="background: var(--yellow);">
        <Library :size="24" strokeWidth="2.5" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalSeries }}</span>
          <span class="stat-label">SERIES</span>
        </div>
      </div>
      <div class="stat-card comic-panel" style="background: var(--blue); color: white;">
        <BookOpen :size="24" strokeWidth="2.5" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalChapters }}</span>
          <span class="stat-label">CHAPTERS</span>
        </div>
      </div>
      <div class="stat-card comic-panel" style="background: var(--green); color: white;">
        <TrendingUp :size="24" strokeWidth="2.5" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.avgProgress }}%</span>
          <span class="stat-label">COMPLETED</span>
        </div>
      </div>
      <div class="stat-card comic-panel" :style="{ background: stats.streak > 0 ? 'var(--accent)' : 'var(--surface)', color: stats.streak > 0 ? 'white' : 'var(--text)' }">
        <Clock :size="24" strokeWidth="2.5" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.streak }}</span>
          <span class="stat-label">DAY STREAK</span>
        </div>
      </div>
    </div>

    <div v-if="itemsWithRealDates.length > 0" class="library-content">
      
      <!-- Focus Overlay (Manuscript) -->
      <Transition name="focus-zoom">
        <div v-if="selectedManga" class="focus-overlay" @click="closeFocus">
            <div class="focus-content" @click.stop>
                <div class="paper-manuscript">
                    <!-- Ink Blot Decors -->
                    <div class="ink-blot blot-1"></div>
                    <div class="ink-blot blot-2"></div>

                    <div class="manuscript-header">
                        <div class="header-left">
                            <img :src="selectedManga.coverUrl" class="manuscript-poster">
                        </div>
                        <div class="header-right">
                            <h2 class="manuscript-title">{{ selectedManga.mangaTitle }}</h2>
                            <div class="manuscript-stats">
                                <span>STATUS: LOGGED</span>
                                <span>CHAPTERS READ: {{ fullChapterList.length }}</span>
                            </div>
                        </div>
                        <button class="close-manuscript" @click="closeFocus">×</button>
                    </div>
                    
                    <div class="manuscript-body">
                        <div class="history-label">EXCLUSIVELY LOGGED CHAPTERS</div>
                        <div v-if="isLoadingChapters" class="manuscript-loading">UNROLLING RECORDS...</div>
                        <div v-else-if="fullChapterList.length === 0" class="no-logs">NO CHAPTER LOGS FOUND.</div>
                        <div v-else class="chapters-parchment">
                            <a v-for="ch in fullChapterList" 
                               :key="ch.chapter_id"
                               :href="`#/read/${ch.chapter_id}/${ch.chapter_number}`"
                               class="parchment-link">
                                <span class="p-num">CH {{ ch.chapter_number }}</span>
                                <span class="p-status">READ</span>
                            </a>
                        </div>
                    </div>

                    <div class="manuscript-footer">
                        <a :href="`#/read/${selectedManga.chapterId}/${selectedManga.chapterNumber}`" class="paper-button hero">RESUME LAST LOG (CH {{ selectedManga.chapterNumber }})</a>
                    </div>
                </div>
            </div>
        </div>
      </Transition>

      <div class="manga-grid">
        <MangaCard v-for="(m, i) in itemsWithRealDates"
                   :key="m.mangaId"
                   :index="i"
                   :title="m.mangaTitle"
                   :coverUrl="m.coverUrl"
                   :latestChapter="m.chapterNumber"
                   :href="`#/read/${m.chapterId}/${m.chapterNumber}`"
                   :showStatusBadges="true"
                   :status="getFallbackDate(m) ? formatTimeShort(getFallbackDate(m)) : null"
                   :isNew="getFallbackDate(m) ? (Date.now() - new Date(getFallbackDate(m)).getTime()) < 18000000 : false"
                   :chapterCount="m.totalChapters"
                   :readingProgress="calculateProgress(m)"
                   @click.prevent="selectManga(m)"
        />
      </div>
    </div>


    <div v-else class="empty-state">
      <div class="empty-box comic-panel">
        <Library :size="64" strokeWidth="1.5" />
        <h3>NO COMICS IN STASH</h3>
        <p>Start reading to automatically save your progress here.</p>
        <a href="#/all" class="comic-button">BROWSE NOW</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-view {
    padding-bottom: 4rem;
}

.page-header {
    margin-bottom: 2rem;
    border-bottom: var(--border-w) solid var(--border);
    padding-bottom: 1rem;
}

.section-title {
    font-size: 3.5rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -2px;
    margin: 0;
    line-height: 1;
}

.library-content {
  position: relative;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.manga-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
}

/* Focus Manuscript Style (Acrylic) */
.focus-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 10, 0.4);
    backdrop-filter: blur(40px) saturate(200%) contrast(90%);
    -webkit-backdrop-filter: blur(40px) saturate(200%) contrast(90%);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
}

/* Subtle grain overlay for acrylic feel */
.focus-overlay::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url('https://www.transparenttextures.com/patterns/dust.png');
    opacity: 0.1;
    pointer-events: none;
}

.focus-content {
    width: 100%;
    max-width: 800px;
}

.paper-manuscript {
    background: #fdfdf9; /* High-quality paper color */
    background-image: url('https://www.transparenttextures.com/patterns/paper-fibers.png');
    border: 4px solid var(--border);
    padding: 3rem;
    position: relative;
    box-shadow: 20px 20px 0 var(--border);
    color: var(--bg);
    overflow: hidden;
}

.ink-blot {
    position: absolute;
    background: var(--bg);
    opacity: 0.08;
    border-radius: 50%;
    filter: blur(12px);
    pointer-events: none;
}

.blot-1 { width: 120px; height: 120px; top: -30px; left: -30px; }
.blot-2 { width: 180px; height: 180px; bottom: -50px; right: -40px; }

.manuscript-header {
    display: flex;
    gap: 2rem;
    margin-bottom: 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px dashed rgba(0,0,0,0.2);
    position: relative;
}

.manuscript-poster {
    width: 140px;
    height: 200px;
    object-fit: cover;
    border: 3px solid var(--border);
    box-shadow: 10px 10px 0 rgba(0,0,0,0.1);
}

.manuscript-title {
    font-size: 2.2rem;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1.1;
    margin-bottom: 1rem;
}

.manuscript-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 900;
    font-size: 0.8rem;
    opacity: 0.7;
    letter-spacing: 2px;
}

.close-manuscript {
    position: absolute;
    top: 0;
    right: 0;
    background: none;
    border: none;
    font-size: 2.5rem;
    font-weight: 900;
    cursor: pointer;
    line-height: 1;
}

.manuscript-body {
    max-height: 350px;
    overflow-y: auto;
    padding-right: 1rem;
}

.history-label {
    font-weight: 900;
    font-size: 0.75rem;
    margin-bottom: 1.5rem;
    letter-spacing: 3px;
    opacity: 0.5;
}

.chapters-parchment {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
}

.parchment-link {
    background: rgba(0,0,0,0.03);
    border: 2px solid rgba(0,0,0,0.1);
    padding: 1.2rem 0.5rem;
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: all 0.2s;
}

.parchment-link:hover {
    background: var(--bg);
    color: white;
    transform: translateY(-4px);
    border-color: var(--bg);
}

.p-num {
    font-weight: 900;
    font-size: 1.1rem;
}

.p-status {
    font-size: 0.6rem;
    font-weight: 900;
    opacity: 0.6;
}

.manuscript-footer {
    margin-top: 2.5rem;
    display: flex;
    justify-content: center;
}

.paper-button.hero {
    background: var(--border);
    color: white;
    padding: 1.5rem 3rem;
    font-weight: 900;
    text-decoration: none;
    font-size: 1.2rem;
    box-shadow: 12px 12px 0 var(--accent);
    transition: all 0.2s;
}

.paper-button.hero:hover {
    transform: translate(-4px, -4px);
    box-shadow: 16px 16px 0 var(--accent);
}

/* Animations (Framer-style Springs) */
.focus-zoom-enter-active {
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.focus-zoom-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.focus-zoom-enter-from {
    opacity: 0;
    transform: scale(0.85) translateY(40px) rotate(-2deg);
}

.focus-zoom-leave-to {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
}

@media (max-width: 800px) {
  .manga-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  .paper-manuscript { padding: 1.5rem; }
  .manuscript-header { flex-direction: column; align-items: center; text-align: center; gap: 1rem; }
  .manuscript-title { font-size: 1.5rem; }
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  color: var(--text);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -1px;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 900;
  margin-top: 4px;
  opacity: 0.9;
}

.empty-state {
    padding: 4rem 0;
    display: flex;
    justify-content: center;
}

.empty-box {
    padding: 4rem;
    text-align: center;
    background: var(--surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    max-width: 500px;
}

.empty-box h3 {
    font-size: 2rem;
    font-weight: 900;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: -1px;
}

.empty-box p {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-secondary);
}

@media (max-width: 768px) {
    .section-title { font-size: 2.5rem; }
    .stats-section { grid-template-columns: 1fr 1fr; gap: 1rem; }
    .stat-card { padding: 1rem; }
    .stat-value { font-size: 1.5rem; }
    .empty-box { padding: 2rem; }
}
</style>

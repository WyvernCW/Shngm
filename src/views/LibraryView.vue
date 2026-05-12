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

            // Background update for real dates
            (async () => {
                for (let i = 0; i < items.value.length; i++) {
                    const item = items.value[i];
                    try {
                        const chRes = await API.getChapterList(item.mangaId);
                        const chapters = chRes?.data || [];
                        const latestCh = chapters[0];
                        const realDate = latestCh?.release_date || latestCh?.created_at;
                        if (realDate) {
                            itemsWithRealDates.value[i].real_updated_at = realDate;
                        }
                    } catch (e) {}
                }
            })();

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
    return m.real_updated_at || m.timestamp || null;
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

    <div v-if="itemsWithRealDates.length > 0" class="manga-grid">
      <MangaCard
        v-for="(m, i) in itemsWithRealDates"
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
      />
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

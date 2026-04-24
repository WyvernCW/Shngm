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

            // Fetch real update times in background (non-blocking, with caching)
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const CACHE_KEY = 'vrtwel_date_cache';
            const CACHE_TTL = 86400000; // 24 hours
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            const now = Date.now();

            (async () => {
                const withDates = [];
                const newCache = {};
                for (const item of items.value) {
                    const cached = cache[item.mangaId];
                    if (cached && (now - cached.timestamp) < CACHE_TTL) {
                        withDates.push({ ...item, real_updated_at: cached.date });
                        newCache[item.mangaId] = cached;
                        continue;
                    }
                    try {
                        await delay(300);
                        let chRes;
                        let retries = 0;
                        while (retries < 2) {
                            try {
                                chRes = await API.getChapterList(item.mangaId);
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
                            withDates.push({ ...item, real_updated_at: realDate });
                            newCache[item.mangaId] = { date: realDate, timestamp: now };
                        } else {
                            withDates.push({ ...item, real_updated_at: null });
                        }
                    } catch (e) {
                        withDates.push({ ...item, real_updated_at: null });
                    }
                }
                itemsWithRealDates.value = withDates;
                localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
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
onActivated(loadLibrary); // Re-load when navigating back to this view

// Reading Statistics
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

    // Calculate reading streak (consecutive days with activity)
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

    // Parse the date (handles both ISO strings and timestamps)
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
    return (now - date.getTime()) < 86400000;
};

// Calculate reading progress based on chapter number vs total chapters
const calculateProgress = (item) => {
    if (!item.totalChapters || !item.chapterNumber) return 0;
    const progress = (parseInt(item.chapterNumber) / parseInt(item.totalChapters)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};
</script>

<template>
  <div class="library-view animate">
    <h2 class="section-title">My Library</h2>

    <!-- Reading Stats -->
    <div v-if="stats" class="stats-section">
      <div class="stat-card">
        <Library :size="20" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalSeries }}</span>
          <span class="stat-label">Series</span>
        </div>
      </div>
      <div class="stat-card">
        <BookOpen :size="20" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalChapters }}</span>
          <span class="stat-label">Chapters</span>
        </div>
      </div>
      <div class="stat-card">
        <TrendingUp :size="20" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.avgProgress }}%</span>
          <span class="stat-label">Avg Progress</span>
        </div>
      </div>
      <div class="stat-card" :class="{ active: stats.streak > 0 }">
        <Clock :size="20" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.streak }}</span>
          <span class="stat-label">Day Streak</span>
        </div>
      </div>
    </div>

    <div v-if="(itemsWithRealDates.length > 0 ? itemsWithRealDates : items).length > 0" class="manga-grid">
      <MangaCard
        v-for="m in (itemsWithRealDates.length > 0 ? itemsWithRealDates : items)"
        :key="m.mangaId"
        :title="m.mangaTitle"
        :coverUrl="m.coverUrl"
        :latestChapter="m.chapterNumber"
        :href="`#/read/${m.chapterId}/${m.chapterNumber}`"
        :showStatusBadges="true"
        :status="m.real_updated_at ? formatTimeShort(m.real_updated_at) : null"
        :isNew="m.real_updated_at ? isRecentlyUpdated(m.real_updated_at) : false"
        :chapterCount="m.totalChapters"
        :readingProgress="calculateProgress(m)"
      />
    </div>

    <div v-else class="empty-state">
      <Library :size="48" style="opacity: 0.3; margin-bottom: 1rem;" />
      <h3>Your library is empty</h3>
      <p>Start reading to save comics here automatically.</p>
    </div>
  </div>
</template>

<style scoped>
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-secondary);
}

.stat-card.active {
  border-color: var(--accent);
  background: rgba(220, 38, 38, 0.08);
  color: var(--accent);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  margin-top: 2px;
}

.stat-card.active .stat-value {
  color: var(--accent);
}
</style>

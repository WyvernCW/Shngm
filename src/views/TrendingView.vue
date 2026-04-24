<script setup>
import { ref, onMounted, watch } from 'vue';
import { API } from '../api.js';
import MangaCard from '../components/MangaCard.vue';

const mangaList = ref([]);
const mangaListWithDates = ref([]);
const isLoading = ref(true);
const activeTab = ref('daily');

const tabs = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' }
];

const loadData = async () => {
    isLoading.value = true;
    mangaListWithDates.value = [];
    try {
        const r = await API.getTrending(activeTab.value, 48);
        mangaList.value = r?.data || [];
        mangaListWithDates.value = mangaList.value.map(m => ({ ...m, real_updated_at: null }));

        // Fetch real update times in background (non-blocking, with caching, all items)
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const CACHE_KEY = 'vrtwel_date_cache';
        const CACHE_TTL = 86400000; // 24 hours
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        const now = Date.now();

        (async () => {
            const withDates = [];
            const newCache = {};
            for (const m of mangaList.value) {
                const cached = cache[m.manga_id];
                if (cached && (now - cached.timestamp) < CACHE_TTL) {
                    withDates.push({ ...m, real_updated_at: cached.date });
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
                        withDates.push({ ...m, real_updated_at: realDate });
                        newCache[m.manga_id] = { date: realDate, timestamp: now };
                    } else {
                        withDates.push({ ...m, real_updated_at: null });
                    }
                } catch (e) {
                    withDates.push({ ...m, real_updated_at: null });
                }
            }
            mangaListWithDates.value = withDates;
            localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
        })();
    } catch (e) {
        console.error(e);
    } finally {
        isLoading.value = false;
    }
};

onMounted(loadData);
watch(activeTab, loadData);

const resolveImg = (m) => API.resolveImg(m);

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
</script>

<template>
  <div class="trending-view animate">
    <h2 class="section-title">Trending</h2>

    <div class="tabs-container">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="isLoading" class="grid-skeleton">
      <div v-for="i in 12" :key="i" class="skeleton-card"></div>
    </div>
    <div v-else class="manga-grid">
      <MangaCard
        v-for="m in (mangaListWithDates.length > 0 ? mangaListWithDates : mangaList)"
        :key="m.manga_id"
        :title="m.title"
        :coverUrl="resolveImg(m)"
        :latestChapter="m.latest_chapter_number"
        :rating="m.user_rate"
        :href="`#/series/${m.manga_id}`"
        :showStatusBadges="true"
        :status="m.real_updated_at ? formatTimeShort(m.real_updated_at) : null"
        :isNew="m.real_updated_at ? (Date.now() - new Date(m.real_updated_at).getTime()) < 86400000 : false"
      />
    </div>
  </div>
</template>

<style scoped>
.tabs-container {
  display: inline-flex;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 4px;
  margin-bottom: 2rem;
  gap: 4px;
}

.tab-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 99px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  background: var(--accent);
  color: white;
}
</style>

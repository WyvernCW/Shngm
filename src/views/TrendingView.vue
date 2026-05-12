<script setup>
import { ref, onMounted, watch } from 'vue';
import { API } from '../api.js';
import MangaCard from '../components/MangaCard.vue';

const mangaListWithDates = ref([]);
const isLoading = ref(true);
const activeTab = ref('daily');

const tabs = [
  { id: 'daily', label: 'DAILY' },
  { id: 'weekly', label: 'WEEKLY' },
  { id: 'monthly', label: 'MONTHLY' }
];

const getFallbackDate = (m) => {
    // Strictly prioritize the actual chapter date to avoid fake freshness
    return m.real_updated_at || null;
};

const loadData = async () => {
    isLoading.value = true;
    mangaListWithDates.value = [];
    try {
        const r = await API.getTrending(activeTab.value, 48);
        const data = r?.data || [];
        
        // Initial setup with null dates
        mangaListWithDates.value = data.map(m => ({ ...m, real_updated_at: null }));

        // Background update for real dates
        (async () => {
            for (let i = 0; i < data.length; i++) {
                const m = data[i];
                try {
                    const chRes = await API.getChapterList(m.manga_id);
                    const chapters = chRes?.data || [];
                    const latestCh = chapters[0];
                    const realDate = latestCh?.release_date || latestCh?.created_at;
                    if (realDate) {
                        mangaListWithDates.value[i].real_updated_at = realDate;
                    }
                } catch (e) {
                    console.error('Error fetching date for', m.manga_id, e);
                }
            }
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
    if (diffMins < 60) return 'FRESH';
    if (diffHours < 5) return 'FRESH';
    if (diffHours < 24) return `${diffHours}H`;
    if (diffDays < 7) return `${diffDays}D`;
    return `${Math.floor(diffDays / 7)}W`;
};
</script>

<template>
  <div class="trending-view">
    
    <div class="page-header">
      <h2 class="section-title">TRENDING NOW</h2>
      
      <div class="comic-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="comic-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="grid-skeleton">
      <div v-for="i in 12" :key="i" class="skeleton-card"></div>
    </div>
    <div v-else class="manga-grid">
      <MangaCard
        v-for="(m, i) in mangaListWithDates"
        :key="m.manga_id"
        :index="i"
        :title="m.title"
        :coverUrl="resolveImg(m)"
        :latestChapter="m.latest_chapter_number"
        :rating="m.user_rate"
        :href="`#/series/${m.manga_id}`"
        :showStatusBadges="true"
        :status="getFallbackDate(m) ? formatTimeShort(getFallbackDate(m)) : null"
        :isNew="getFallbackDate(m) ? (Date.now() - new Date(getFallbackDate(m)).getTime()) < 18000000 : false"
      />
    </div>
  </div>
</template>


<style scoped>
.trending-view {
    padding-bottom: 4rem;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 3rem;
    border-bottom: var(--border-w) solid var(--border);
    padding-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1.5rem;
}

.section-title {
    font-size: 3.5rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -2px;
    margin: 0;
    line-height: 1;
}

/* Comic Tabs */
.comic-tabs {
    display: flex;
    gap: 0;
    background: var(--surface);
    border: var(--border-w) solid var(--border);
    box-shadow: var(--shadow-offset) var(--shadow-offset) 0 var(--border);
}

.comic-tab {
    padding: 12px 24px;
    font-weight: 900;
    font-size: 1rem;
    background: transparent;
    color: var(--text-secondary);
    border: none;
    border-right: var(--border-w) solid var(--border);
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Outfit', sans-serif;
}

.comic-tab:last-child {
    border-right: none;
}

.comic-tab:hover {
    color: var(--text);
    background: var(--bg);
}

.comic-tab.active {
    background: var(--accent);
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

@media (max-width: 768px) {
    .page-header { flex-direction: column; align-items: flex-start; }
    .section-title { font-size: 2.5rem; }
    .comic-tabs { width: 100%; display: grid; grid-template-columns: 1fr 1fr 1fr; }
    .comic-tab { padding: 12px 0; font-size: 0.85rem; }
}
</style>

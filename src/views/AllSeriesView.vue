<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { API } from '../api.js';
import MangaCard from '../components/MangaCard.vue';

const props = defineProps({
  params: Object
});

const page = computed(() => parseInt(props.params.parts[0]) || 1);
const genre = computed(() => props.params.queryParams.genre || '');

const mangaListWithDates = ref([]);
const totalPages = ref(20);
const isLoading = ref(true);

const loadData = async () => {
    isLoading.value = true;
    mangaListWithDates.value = [];
    try {
        const r = await API.getAllSeries(page.value, 32, genre.value);
        const data = r?.data || [];
        totalPages.value = r?.meta?.last_page || 20;
        
        mangaListWithDates.value = data.map(m => ({ ...m, real_updated_at: null }));

        // --- ATOMIC PARALLEL FRESHNESS ---
        API.getChapterDatesParallel(mangaListWithDates.value, (id, date) => {
            const idx = mangaListWithDates.value.findIndex(m => m.manga_id === id);
            if (idx !== -1) mangaListWithDates.value[idx].real_updated_at = date;
        });


    } catch (e) {
        console.error(e);
    } finally {
        isLoading.value = false;
    }
};
watch([page, genre], loadData, { immediate: true });

const setPage = (p) => {
    window.location.hash = window.location.hash.replace(/\/\d+($|\?)/, `/${p}$1`);
    if (!window.location.hash.includes(`/${p}`)) {
        const parts = window.location.hash.split('?');
        window.location.hash = parts[0] + `/${p}` + (parts[1] ? '?' + parts[1] : '');
    }
};

const clearGenreFilter = () => {
    const parts = window.location.hash.split('?');
    window.location.hash = parts[0];
};

const resolveImg = (m) => API.resolveImg(m);

const getFallbackDate = (m) => {
    // Strictly prioritize the actual chapter date to avoid fake freshness
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
</script>

<template>
  <div class="all-series-view">
    
    <div class="page-header-row">
      <h2 class="section-title">BROWSE ALL</h2>
      <div v-if="genre" class="active-filter-badge comic-panel">
        #{{ genre.toUpperCase() }}
        <button class="remove-filter comic-button" @click="clearGenreFilter">✕</button>
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
        :type="m.taxonomy?.Format?.[0]?.name"
        :href="`#/series/${m.manga_id}`"
        :showStatusBadges="true"
        :status="getFallbackDate(m) ? formatTimeShort(getFallbackDate(m)) : null"
        :isNew="getFallbackDate(m) ? (Date.now() - new Date(getFallbackDate(m)).getTime()) < 18000000 : false"
      />
    </div>

    <div class="pagination" v-if="!isLoading">
      <button v-for="p in totalPages" :key="p" 
              class="page-btn comic-button" :class="{ 'secondary': p !== page }"
              @click="setPage(p)">
        {{ p }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.all-series-view {
    padding-bottom: 4rem;
}

.page-header-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2rem;
    margin-bottom: 3rem;
    border-bottom: var(--border-w) solid var(--border);
    padding-bottom: 1rem;
}

.section-title {
    font-size: 3rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -2px;
    margin: 0;
}

.active-filter-badge {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--yellow);
    color: var(--text);
    padding: 8px 16px;
    font-weight: 900;
    font-size: 1rem;
}

.remove-filter {
    padding: 4px 8px;
    font-size: 0.8rem;
    background: var(--text);
    color: var(--bg);
}
.remove-filter:hover {
    background: var(--accent);
}

.pagination {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 4rem;
}

.page-btn {
    padding: 8px 16px;
    min-width: 48px;
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

@media (max-width: 640px) {
    .section-title { font-size: 2rem; }
    .page-header-row { gap: 1rem; margin-bottom: 2rem; }
    .page-btn { padding: 8px 12px; min-width: 40px; }
}
</style>

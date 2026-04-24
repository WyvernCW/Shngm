<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { API } from '../api.js';
import MangaCard from '../components/MangaCard.vue';

const props = defineProps({
  params: Object
});

const page = computed(() => parseInt(props.params.parts[0]) || 1);
const genre = computed(() => props.params.queryParams.genre || '');

const mangaList = ref([]);
const mangaListWithDates = ref([]);
const totalPages = ref(20);
const isLoading = ref(true);

const loadData = async () => {
    isLoading.value = true;
    mangaListWithDates.value = [];
    try {
        const r = await API.getAllSeries(page.value, 32, genre.value);
        mangaList.value = r?.data || [];
        totalPages.value = r?.meta?.last_page || 20;
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
            // No remaining items - all processed
            mangaListWithDates.value = withDates;
            localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
        })();
    } catch (e) {
        console.error(e);
    } finally {
        isLoading.value = false;
    }
};

watch([page, genre], loadData, { immediate: true });

const resolveImg = (m) => {
    const CDN = 'https://assets.shngm.id/';
    const mid = m.manga_id || m.id;
    const candidates = [m.cover_portrait_url, m.cover_url, m.thumbnail];
    for (const raw of candidates) {
        if (!raw) continue;
        if (raw.startsWith('http')) return raw;
        if (raw.startsWith('thumbnail/')) return CDN + raw;
        if (/^[0-9a-f-]{32,}$/i.test(raw)) return CDN + 'thumbnail/image/' + raw + '.jpg';
    }
    return CDN + 'thumbnail/image/' + mid + '.jpg';
};

const setPage = (p) => {
    const g = genre.value ? `?genre=${genre.value}` : '';
    window.location.hash = `#/all/${p}${g}`;
};

const clearGenreFilter = () => {
    window.location.hash = '#/all';
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
    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
};
</script>

<template>
  <div class="all-series-view animate">
    <div class="page-header-row" style="display:flex; align-items:center; gap:1rem; margin-bottom:2rem;">
      <h2 class="section-title">Browse All</h2>
      <div v-if="genre" class="active-filter-badge" style="background:var(--accent); color:white; padding:0.4rem 1rem; border-radius:99px; font-weight:700; font-size:0.85rem; display:flex; align-items:center; gap:0.5rem;">
        {{ genre }}
        <span class="remove-filter" style="cursor:pointer; opacity:0.8;" @click="clearGenreFilter">✕</span>
      </div>
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
        :type="m.taxonomy?.Format?.[0]?.name"
        :href="`#/series/${m.manga_id}`"
        :showStatusBadges="true"
        :status="m.real_updated_at ? formatTimeShort(m.real_updated_at) : null"
        :isNew="m.real_updated_at ? (Date.now() - new Date(m.real_updated_at).getTime()) < 86400000 : false"
      />
    </div>

    <div class="pagination" v-if="!isLoading">
      <button v-for="p in totalPages" :key="p" 
              class="page-btn" :class="{ 'page-btn-active': p === page }"
              @click="setPage(p)">
        {{ p }}
      </button>
    </div>
  </div>
</template>

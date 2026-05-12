<script setup>
import { ref, onMounted, watch } from 'vue';
import { API } from '../api.js';
import { Search, X } from 'lucide-vue-next';
import MangaCard from '../components/MangaCard.vue';

const props = defineProps({
    params: Object
});

const query = ref(props.params?.parts?.[0] || '');
const resultsWithDates = ref([]);
const isLoading = ref(false);

const getFallbackDate = (m) => {
    return m.real_updated_at || m.updated_at || m.created_at || m.release_date || m.last_updated || null;
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

const handleSearch = async () => {
    if (!query.value || query.value.length < 2) {
        resultsWithDates.value = [];
        return;
    }
    
    isLoading.value = true;
    try {
        const res = await API.search(query.value);
        const data = res?.data || [];
        resultsWithDates.value = data.map(m => ({ ...m, real_updated_at: null }));

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
                        resultsWithDates.value[i].real_updated_at = realDate;
                    }
                } catch (e) {}
            }
        })();


        const newHash = `#/search/${encodeURIComponent(query.value)}`;
        if (window.location.hash !== newHash) {
            history.replaceState(null, '', newHash);
        }
    } catch (e) {
        console.error(e);
    } finally {
        isLoading.value = false;
    }
};


onMounted(() => {
    if (query.value) handleSearch();
});

watch(() => props.params?.parts?.[0], (newQ) => {
    if (newQ && newQ !== query.value) {
        query.value = newQ;
        handleSearch();
    }
});

const clear = () => {
    query.value = '';
    resultsWithDates.value = [];
    history.replaceState(null, '', '#/search');
};

const resolveImg = (m) => API.resolveImg(m);
</script>

<template>
  <div class="search-view">
    
    <div class="search-hero">
      <div class="search-box-wrap comic-panel">
        <Search class="search-icon" :size="32" strokeWidth="2.5" />
        <input v-model="query" 
               type="text" 
               placeholder="SEARCH COMICS..." 
               @keyup.enter="handleSearch"
               class="search-input">
        <button v-if="query" @click="clear" class="clear-btn comic-button secondary">
            <X :size="24" strokeWidth="2.5" />
        </button>
        <button @click="handleSearch" class="comic-button">SEARCH</button>
      </div>
    </div>

    <div class="search-results-container">
      <div v-if="isLoading" class="grid-skeleton">
        <div v-for="i in 8" :key="i" class="skeleton-card"></div>
      </div>

      <template v-else-if="resultsWithDates.length > 0">
        <div class="results-meta">
          FOUND <strong>{{ resultsWithDates.length }}</strong> MATCHES
        </div>
        
        <div class="manga-grid">
          <MangaCard 
            v-for="(m, i) in resultsWithDates" :key="m.manga_id" 
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

      </template>

      <div v-else-if="query && !isLoading" class="empty-state">
        <div class="empty-box comic-panel">
            <X :size="64" class="muted-icon" />
            <h3>NO MATCHES FOR "{{ query.toUpperCase() }}"</h3>
            <p>Try different keywords or check spelling.</p>
        </div>
      </div>

      <div v-else-if="!query" class="empty-state">
        <div class="empty-box comic-panel" style="background: var(--yellow);">
            <Search :size="64" strokeWidth="2.5" style="margin-bottom: 1rem;" />
            <h3>START SEARCHING</h3>
            <p>Type above to find your next favorite read.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-view { min-height: 80vh; padding-bottom: 4rem; }

.search-hero {
  padding: 4rem 1rem;
  display: flex;
  justify-content: center;
  background-image: repeating-linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%, var(--border)), repeating-linear-gradient(45deg, var(--border) 25%, var(--bg) 25%, var(--bg) 75%, var(--border) 75%, var(--border));
  background-position: 0 0, 10px 10px;
  background-size: 20px 20px;
  border-bottom: var(--border-w) solid var(--border);
  margin: -3rem -3rem 3rem -3rem; /* Compensate for view padding */
}

@media (max-width: 1024px) {
    .search-hero { margin: -1.5rem -1.5rem 3rem -1.5rem; }
}

.search-box-wrap {
  width: 100%;
  max-width: 900px;
  display: flex;
  align-items: stretch;
  padding: 0;
  background: var(--surface);
  transform: rotate(-1deg);
}

.search-box-wrap:focus-within {
  transform: rotate(0deg);
  box-shadow: 8px 8px 0 var(--accent);
}

.search-icon { 
    margin: 1rem 1.5rem; 
    color: var(--text); 
    align-self: center;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  color: var(--text);
  padding: 1.5rem 1rem 1.5rem 0;
  font-size: 2rem;
  font-weight: 900;
  outline: none;
  text-transform: uppercase;
  font-family: 'Outfit', sans-serif;
  letter-spacing: -1px;
}
.search-input::placeholder { color: var(--text-secondary); opacity: 0.5; }

.clear-btn {
    padding: 0 1.5rem;
    border: none;
    border-left: var(--border-w) solid var(--border);
    box-shadow: none;
}
.clear-btn:hover {
    transform: none;
    box-shadow: none;
}
.search-btn {
    border: none;
    border-left: var(--border-w) solid var(--border);
    box-shadow: none;
    font-size: 1.2rem;
    padding: 0 2rem;
}
.search-btn:hover {
    transform: none;
    box-shadow: inset 4px 4px 0 rgba(0,0,0,0.1);
}

.search-results-container { padding: 0; max-width: 1300px; margin: 0 auto; }
.results-meta { 
    margin-bottom: 2rem; 
    font-size: 1.5rem; 
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -1px;
    border-bottom: var(--border-w) solid var(--border);
    padding-bottom: 1rem;
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

.empty-state { display: flex; justify-content: center; padding: 4rem 1rem; }
.empty-box {
    padding: 4rem;
    text-align: center;
    max-width: 600px;
    background: var(--surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}
.empty-box h3 {
    font-size: 2.5rem;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -1px;
    margin: 0;
}
.empty-box p {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-secondary);
}

@media (max-width: 768px) {
  .search-hero { padding: 3rem 1rem; transform: none; }
  .search-input { font-size: 1.2rem; padding: 1rem 0; }
  .search-icon { margin: 0 1rem; }
  .search-btn { display: none; }
  .clear-btn { padding: 0 1rem; }
  .empty-box h3 { font-size: 1.8rem; }
}
</style>

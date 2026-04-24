<script setup>
import { ref, onMounted, watch } from 'vue';
import { API } from '../api.js';
import { Search, X, Loader2, Globe } from 'lucide-vue-next';
import MangaCard from '../components/MangaCard.vue';

const props = defineProps({
    params: Object
});

const query = ref(props.params?.parts?.[0] || '');
const results = ref([]);
const isLoading = ref(false);

const handleSearch = async () => {
    if (!query.value || query.value.length < 2) {
        results.value = [];
        return;
    }
    
    isLoading.value = true;
    try {
        const res = await API.search(query.value);
        results.value = res?.data || [];
        
        // Update URL hash without reload
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
    results.value = [];
    history.replaceState(null, '', '#/search');
};

const resolveImg = (m) => API.resolveImg(m);
</script>

<template>
  <div class="search-view animate">
    <div class="search-hero">
      <div class="search-box-wrap glass">
        <Search class="search-icon" :size="24" />
        <input v-model="query" 
               type="text" 
               placeholder="Search manga, manhwa, or author..." 
               @keyup.enter="handleSearch"
               class="search-input">
        <button v-if="query" @click="clear" class="clear-btn"><X :size="20" /></button>
        <button @click="handleSearch" class="search-btn">Search</button>
      </div>
    </div>

    <div class="search-results-container">
      <div v-if="isLoading" class="grid-skeleton">
        <div v-for="i in 8" :key="i" class="skeleton-card"></div>
      </div>

      <template v-else-if="results.length > 0">
        <div class="results-meta">
          Found <strong>{{ results.length }}</strong> series across <strong>2</strong> sources
        </div>
        
        <div class="manga-grid">
          <MangaCard 
            v-for="m in results" :key="m.manga_id" 
            :title="m.title"
            :coverUrl="resolveImg(m)"
            :latestChapter="m.latest_chapter_number"
            :rating="m.user_rate"
            :type="m.taxonomy?.Format?.[0]?.name"
            :href="`#/series/${m.manga_id}`"
          />
        </div>
      </template>

      <div v-else-if="query && !isLoading" class="empty-state">
        <X :size="64" class="muted-icon" />
        <h3>No results found for "{{ query }}"</h3>
        <p>Try searching with different keywords or check the spelling.</p>
      </div>

      <div v-else-if="!query" class="empty-state">
        <Search :size="64" class="muted-icon" />
        <h3>Search</h3>
        <p>Type above to search manga and manhwa.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-view { min-height: 80vh; }

.search-hero {
  padding: 4rem 1rem;
  display: flex;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(139, 92, 246, 0.1), transparent 70%);
}

.search-box-wrap {
  width: 100%;
  max-width: 800px;
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  border: 1px solid var(--border);
}

.search-icon { margin-left: 0.5rem; color: var(--muted); }
.search-input {
  flex: 1;
  background: none;
  border: none;
  color: var(--text);
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  outline: none;
}
.search-input::placeholder { color: var(--muted); font-weight: 500; }

.search-box-wrap:focus-within {
  border-color: rgba(220, 38, 38, 0.5);
  box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.clear-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 0.5rem; border-radius: 50%; display: flex; align-items: center; }
.clear-btn:hover { color: var(--text); background: rgba(255,255,255,0.05); }

.search-btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: 0.8rem 2rem;
  border-radius: 99px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
}
.search-btn:hover { transform: scale(1.05); filter: brightness(1.1); }

.search-results-container { padding: 0 1rem 4rem; max-width: 1200px; margin: 0 auto; }
.results-meta { margin-bottom: 2rem; color: var(--muted); font-size: 0.9rem; }
.results-meta strong { color: var(--text); }

.loader-state { text-align: center; padding: 4rem 0; color: var(--muted); }
.spin { margin-bottom: 1rem; color: var(--accent); animation: rotate 1s linear infinite; }

.empty-state { text-align: center; padding: 6rem 0; color: var(--muted); }
.muted-icon { margin-bottom: 1.5rem; opacity: 0.2; }

/* Source Badge */
.source-badge {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    z-index: 5;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}
.source-badge.mwd { background: #a855f7; color: white; border: 1px solid rgba(255,255,255,0.2); }

.card-meta { display: flex; gap: 0.8rem; font-size: 0.7rem; color: var(--muted); margin-top: 0.4rem; font-weight: 700; }

@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .search-hero { padding: 2rem 1rem; }
  .search-btn { display: none; }
  .search-input { font-size: 1rem; padding: 0.8rem; }
}
</style>

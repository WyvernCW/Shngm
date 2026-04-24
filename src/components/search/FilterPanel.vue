<script setup>
import { X, Filter, Check, SlidersHorizontal } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps({
  filters: Object,
  genres: Array,
  isOpen: Boolean
});

const emit = defineEmits(['close', 'toggle-genre', 'update']);

const formatOptions = ['All', 'Manga', 'Manhwa', 'Manhua'];
const statusOptions = ['All', 'Ongoing', 'Completed', 'Hiatus'];
const sortOptions = [
  { label: 'Latest Update', value: 'latest' },
  { label: 'Popularity', value: 'popular' },
  { label: 'A-Z', value: 'alphabetical' },
  { label: 'Rating', value: 'rating' }
];
</script>

<template>
  <div class="filter-panel" :class="{ 'mobile-hidden': !isOpen }">
    <div class="filter-header">
      <div class="header-title">
        <Filter :size="18" />
        <h3>Filters</h3>
      </div>
      <button class="close-btn md-hidden" @click="emit('close')">
        <X :size="20" />
      </button>
    </div>

    <div class="filter-scroll-area">
      <!-- Search Mode / Type -->
      <section class="filter-section">
        <label>Format</label>
        <div class="chip-grid">
          <button v-for="opt in formatOptions" :key="opt" 
                  class="chip" :class="{ active: filters.type === opt }"
                  @click="filters.type = opt">
            {{ opt }}
          </button>
        </div>
      </section>

      <!-- Genres -->
      <section class="filter-section">
        <div class="section-header">
          <label>Genres</label>
          <span class="count-badge" v-if="filters.genres.length">{{ filters.genres.length }}</span>
        </div>
        <div class="chip-grid">
          <button v-for="genre in genres" :key="genre.slug" 
                  class="chip genre-chip" :class="{ active: filters.genres.includes(genre.slug) }"
                  @click="emit('toggle-genre', genre.slug)">
            {{ genre.name }}
          </button>
        </div>
      </section>

      <!-- Status -->
      <section class="filter-section">
        <label>Status</label>
        <div class="chip-grid">
          <button v-for="opt in statusOptions" :key="opt" 
                  class="chip" :class="{ active: filters.status === opt }"
                  @click="filters.status = opt">
            {{ opt }}
          </button>
        </div>
      </section>

      <!-- Sort -->
      <section class="filter-section">
        <label>Sort By</label>
        <select v-model="filters.sort" class="filter-select">
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </section>

      <!-- Rating -->
      <section class="filter-section">
        <label>Minimum Rating</label>
        <input type="range" min="0" max="10" step="1" v-model="filters.rating" class="range-slider">
        <div class="range-labels">
          <span>0</span>
          <span class="active-val">{{ filters.rating }}+ ★</span>
          <span>10</span>
        </div>
      </section>
    </div>

    <div class="filter-footer">
      <button class="btn-outline" @click="$emit('clear')">Clear All</button>
      <button class="btn-primary" @click="emit('close')">Apply Filters</button>
    </div>
  </div>
</template>

<style scoped>
.filter-panel {
  width: 260px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: fit-content;
  max-height: calc(100vh - 100px);
  position: sticky;
  top: 80px;
}

.filter-header {
  padding: 1.2rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--accent);
}

.filter-scroll-area {
  padding: 1.2rem;
  overflow-y: auto;
  flex: 1;
}

.filter-section {
  margin-bottom: 1.8rem;
}

.filter-section label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  padding: 0.4rem 0.8rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover { border-color: var(--accent); }
.chip.active {
  background: rgba(139, 92, 246, 0.15);
  border-color: var(--accent);
  color: var(--accent);
}

.genre-chip {
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
}

.filter-select {
  width: 100%;
  padding: 0.6rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: white;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.5rem;
}

.active-val {
  color: var(--accent);
  font-weight: 700;
}

.filter-footer {
  padding: 1.2rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 0.8rem;
}

.filter-footer button {
  flex: 1;
  font-size: 0.85rem;
  padding: 0.6rem;
}

@media (max-width: 900px) {
  .filter-panel {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-height: 100%;
    z-index: 2000;
    border-radius: 0;
    top: 0;
  }
  .filter-panel.mobile-hidden {
    display: none;
  }
}
</style>

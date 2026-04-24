<script setup>
import { X } from 'lucide-vue-next';

defineProps({
  filters: Object,
  count: Number
});

defineEmits(['clear', 'remove']);
</script>

<template>
  <div class="active-filters-row" v-if="count > 0">
    <span class="results-count">Showing {{ count }} filter{{ count > 1 ? 's' : '' }}:</span>
    
    <div class="chips-container">
      <!-- Type Chip -->
      <div v-if="filters.type !== 'All'" class="filter-chip">
        Type: {{ filters.type }}
        <button class="remove-chip" @click="$emit('remove', 'type')"><X :size="14" /></button>
      </div>

      <!-- Genres Chips -->
      <div v-for="g in filters.genres" :key="g" class="filter-chip">
        {{ g }}
        <button class="remove-chip" @click="$emit('remove', 'genres', g)"><X :size="14" /></button>
      </div>

      <!-- Status Chip -->
      <div v-if="filters.status !== 'All'" class="filter-chip">
        Status: {{ filters.status }}
        <button class="remove-chip" @click="$emit('remove', 'status')"><X :size="14" /></button>
      </div>

      <!-- Rating Chip -->
      <div v-if="filters.rating > 0" class="filter-chip">
        {{ filters.rating }}+ ★
        <button class="remove-chip" @click="$emit('remove', 'rating')"><X :size="14" /></button>
      </div>

      <button class="btn-clear-minimal" @click="$emit('clear')">Clear All</button>
    </div>
  </div>
</template>

<style scoped>
.active-filters-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.results-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--accent);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 600;
}

.remove-chip {
  background: rgba(0,0,0,0.2);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  cursor: pointer;
  transition: background 0.2s;
}

.remove-chip:hover {
  background: rgba(0,0,0,0.4);
}

.btn-clear-minimal {
  background: none;
  border: none;
  color: var(--rose);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-clear-minimal:hover {
  text-decoration: underline;
}
</style>

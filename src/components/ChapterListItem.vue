<script setup>
const props = defineProps({
  title: String,
  mangaTitle: String,
  time: String,
  coverUrl: String,
  isNew: Boolean,
  status: String,
  href: String,
  showStatusBadges: Boolean,
  
  number: [String, Number],
  date: String,
  isRead: Boolean,
  onRemove: Function
});
</script>

<template>
  <div class="chapter-row" :class="{ 'is-read': isRead }">
    <a :href="href" class="chapter-main">
      <span class="ch-number">Chapter {{ number || title?.replace(/Chapter /i, '') || '??' }}</span>
      <span v-if="date || time" class="ch-date">{{ date || time }}</span>
    </a>
    <div class="ch-actions">
      <span v-if="isNew" class="ch-new-dot"></span>
      <button v-if="onRemove" class="ch-remove-btn" @click.prevent="onRemove">−</button>
    </div>
  </div>
</template>

<style scoped>
.chapter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.9rem 1.2rem;
  transition: background 0.15s;
  gap: 1rem;
  margin-bottom: 0.5rem;
}
.chapter-row:hover { background: rgba(139,92,246,0.07); }
.chapter-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-decoration: none;
  flex: 1;
}
.ch-number {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text);
}
.ch-date {
  font-size: 0.72rem;
  color: var(--muted);
}
.is-read .ch-number { opacity: 0.45; }
.ch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.ch-remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.04);
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.ch-remove-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(220,38,38,0.08); }
.ch-new-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
</style>

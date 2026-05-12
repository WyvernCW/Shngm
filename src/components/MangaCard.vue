<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: String,
  coverUrl: String,
  latestChapter: [String, Number],
  rating: [String, Number],
  type: String,
  status: String,
  isNew: Boolean,
  href: String,
  showStatusBadges: Boolean,
  source: String,
  chapterCount: Number,
  unreadCount: Number,
  readingProgress: Number,
  index: { type: Number, default: 0 }
});

const isVeryRecent = computed(() => {
  if (!props.status) return false;
  return props.status === 'FRESH';
});
</script>

<template>
  <a :href="href" class="manga-card">
    
    <div class="comic-panel poster-wrap">
      <img :src="coverUrl" :alt="title" loading="lazy" class="poster-img" @error="e => e.target.src = '/assets/covers/standard.svg'">

      <div class="top-left-badges">
        <div v-if="showStatusBadges && status" class="comic-badge time-badge" :class="{ 'recent': isVeryRecent }">
          {{ isVeryRecent ? 'FRESH' : status.toUpperCase() }}
        </div>
        <div v-if="showStatusBadges && isNew" class="comic-badge new-badge">
          NEW CH
        </div>
      </div>

      <div v-if="type" class="comic-badge type-tag">{{ type }}</div>

      <div v-if="unreadCount && unreadCount > 0" class="comic-badge unread-badge">
        +{{ unreadCount }}
      </div>
      <div v-else-if="chapterCount && chapterCount > 0" class="comic-badge chapter-count-badge">
        {{ chapterCount }} CH
      </div>
    </div>

    <div class="manga-details">
      <h3 class="manga-title">{{ title }}</h3>
      <div class="manga-meta">
        <span class="chapter-label">CH. {{ latestChapter || '??' }}</span>
        <span v-if="rating" class="rating-label">★ {{ parseFloat(rating).toFixed(1) }}</span>
      </div>
      <div v-if="readingProgress !== undefined && readingProgress > 0" class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: readingProgress + '%' }"></div>
        </div>
      </div>
    </div>
  </a>
</template>

<style scoped>
.manga-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--text);
  width: 100%;
  outline: none;
  padding-bottom: 8px; /* space for translation on hover */
}

.poster-wrap {
  aspect-ratio: 2 / 3;
  overflow: hidden;
  position: relative;
  /* Utilizes .comic-panel from style.css automatically for border/shadow/hover */
}

.poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: saturate(1.1) contrast(1.1); /* Comic vibe */
}

.manga-card:hover .poster-img {
  transform: scale(1.05);
}

/* Comic Badges */
.comic-badge {
  background: var(--surface);
  color: var(--text);
  border: 2px solid var(--border);
  box-shadow: 2px 2px 0 var(--border);
  font-weight: 900;
  font-size: 0.65rem;
  letter-spacing: 0.5px;
  padding: 4px 8px;
  text-transform: uppercase;
}

.top-left-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 5;
}

.time-badge { background: var(--surface); }
.time-badge.recent { background: var(--green); color: white; }

.new-badge {
  background: var(--accent);
  color: #fff;
  transform: rotate(-3deg);
  transform-origin: left center;
}

.type-tag {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: var(--yellow);
  z-index: 5;
}

.unread-badge, .chapter-count-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--blue);
  color: white;
  z-index: 5;
}

.manga-details {
  padding: 12px 0 0;
}

.manga-title {
  font-size: 1rem;
  font-weight: 900;
  margin: 0 0 4px;
  line-height: 1.2;
  /* Multi-line truncation for better layout */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s;
}

.manga-card:hover .manga-title { color: var(--accent); }

.manga-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 0.8rem;
}

.chapter-label { color: var(--text-secondary); }
.rating-label { color: var(--text); background: var(--yellow); padding: 2px 6px; border: 2px solid var(--border); border-radius: 4px; font-size: 0.7rem; }

.progress-wrap {
  margin-top: 8px;
  width: 100%;
}
.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--surface);
  border: 2px solid var(--border);
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-right: 2px solid var(--border);
}

@media (max-width: 640px) {
  .manga-title { font-size: 0.9rem; }
  .manga-meta { font-size: 0.7rem; }
}
</style>

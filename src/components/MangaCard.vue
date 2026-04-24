<script setup>
import { computed } from 'vue';
import { Clock, Star, BookOpen } from 'lucide-vue-next';

const props = defineProps({
  title: String,
  coverUrl: String,
  latestChapter: [String, Number],
  rating: [String, Number],
  type: String,
  status: String,        // e.g. "11h", "2d"
  isNew: Boolean,        // shows red "UP" badge
  href: String,
  showStatusBadges: Boolean,
  source: String,        // e.g. "MWD", "LOCAL" — shown as small tag
  chapterCount: Number,  // Total chapters (e.g. 142)
  unreadCount: Number,   // New/unread chapters (e.g. 3)
  readingProgress: Number, // Percentage 0-100 for progress bar
});

const formattedRating = computed(() => {
  const r = parseFloat(props.rating || 5);
  return r.toFixed(1);
});
</script>

<template>
  <a :href="href" class="manga-card">
    <div class="poster-wrap">
      <img :src="coverUrl" :alt="title" loading="lazy" class="poster-img" @error="e => e.target.src = '/assets/covers/standard.svg'">

      <div class="top-left-badges">
        <div v-if="showStatusBadges && status" class="time-badge">
          <Clock :size="9" />
          <span>{{ status }}</span>
        </div>
        <div v-if="showStatusBadges && isNew" class="up-badge">UP</div>
      </div>

      <div v-if="type" class="type-tag">{{ type }}</div>

      <!-- Unread Badge -->
      <div v-if="unreadCount && unreadCount > 0" class="unread-badge">
        +{{ unreadCount }} new
      </div>

      <!-- Chapter Count Badge -->
      <div v-else-if="chapterCount && chapterCount > 0" class="chapter-count-badge">
        <BookOpen :size="9" /> {{ chapterCount }}
      </div>

      <!-- Bottom Overlay -->
      <div class="poster-overlay">
        <div class="overlay-content">
          <div v-if="rating" class="rating-badge">
            <Star :size="10" fill="currentColor" /> {{ formattedRating }}
          </div>
        </div>
      </div>
    </div>

    <div class="manga-details">
      <h3 class="manga-title">{{ title }}</h3>
      <div class="manga-meta">
        <span class="chapter-label">CH.{{ latestChapter || '??' }}</span>
      </div>
      <!-- Reading Progress Bar -->
      <div v-if="readingProgress !== undefined && readingProgress > 0" class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: readingProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ Math.round(readingProgress) }}%</span>
      </div>
    </div>
  </a>
</template>

<style scoped>
.manga-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: white;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  width: 100%;
}

.poster-wrap {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  overflow: hidden;
  background: var(--card-bg);
  border: 1px solid var(--border);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.manga-card:hover .poster-wrap {
  transform: translateY(-8px);
  border-color: var(--accent);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(220, 38, 38, 0.2);
}

.manga-card:hover .poster-img {
  transform: scale(1.1);
}

.top-left-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 5;
}
.time-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  color: #fff;
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 700;
}
.up-badge {
  background: #ef4444;
  color: #fff;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.5px;
  width: fit-content;
}

.type-tag {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  color: #e2e8f0;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.3px;
  border: 1px solid rgba(255,255,255,0.08);
  z-index: 5;
}

.poster-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, transparent 100%);
  display: flex;
  align-items: flex-end;
  padding: 10px;
  opacity: 0.9;
}

.overlay-content {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  align-items: center;
}

.rating-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--gold);
  font-size: 0.65rem;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.manga-details {
  padding: 10px 4px;
}

.manga-title {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #f1f5f9;
}

.chapter-label {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 600;
}

/* Progress Bar */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.progress-bar {
  flex: 1;
  height: 3px;
  background: var(--surface);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 0.65rem;
  color: var(--text-secondary);
  font-weight: 600;
}

/* Unread & Chapter Count Badges */
.unread-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--accent);
  color: white;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 800;
  z-index: 5;
}
.chapter-count-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  color: #e2e8f0;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 0.58rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 3px;
  z-index: 5;
}

@media (max-width: 640px) {
  .manga-title { font-size: 0.85rem; }
  .chapter-label { font-size: 0.7rem; }
}
</style>

<script setup>
import { CheckCircle2, ChevronLeft, ChevronRight, Bell, Star } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';

const props = defineProps({
  mangaTitle: String,
  chapterNumber: [String, Number],
  hasNext: Boolean,
  hasPrev: Boolean,
  nextChapter: Object,
  prevChapter: Object,
  autoAdvance: Boolean
});

const emit = defineEmits(['navigate', 'back']);

const rating = ref(0);
const countdown = ref(10);
const isNotified = ref(false);

const setRating = (r) => {
  rating.value = r;
  localStorage.setItem(`rating_${props.mangaTitle}`, r);
};

onMounted(() => {
  const saved = localStorage.getItem(`rating_${props.mangaTitle}`);
  if (saved) rating.value = parseInt(saved);

  if (props.hasNext && props.autoAdvance) {
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(timer);
        emit('navigate', 'next');
      }
    }, 1000);
  }
});
</script>

<template>
  <div class="end-screen-overlay glass animate-fade-in">
    <div class="end-screen-content">
      <div class="success-icon-wrap">
        <CheckCircle2 :size="80" class="success-icon" />
      </div>

      <h1 class="success-title">Chapter {{ chapterNumber }} Complete!</h1>
      <p class="success-subtitle">{{ mangaTitle }}</p>

      <div class="rating-section">
        <p>Rate this chapter</p>
        <div class="star-row">
          <Star v-for="i in 5" :key="i" 
                :size="32" 
                :class="{ 'filled': i <= rating }"
                :fill="i <= rating ? '#7C3AED' : 'none'"
                @click="setRating(i)" />
        </div>
      </div>

      <div class="navigation-options">
        <button v-if="hasPrev" class="nav-btn secondary" @click="emit('navigate', 'prev')">
          <ChevronLeft :size="20" />
          Previous Chapter
        </button>

        <button v-if="hasNext" class="nav-btn primary" @click="emit('navigate', 'next')">
          Next Chapter
          <ChevronRight :size="20" />
        </button>

        <div v-else class="caught-up-msg">
          <div class="celebration-icon">🎉</div>
          <h3>You're all caught up!</h3>
          <button class="notify-btn" :class="{ 'notified': isNotified }" @click="isNotified = !isNotified">
            <Bell :size="18" />
            {{ isNotified ? 'Notification On' : 'Notify me of next chapter' }}
          </button>
        </div>
      </div>

      <div v-if="hasNext && autoAdvance && countdown > 0" class="auto-advance-countdown">
        Going to Next Chapter in {{ countdown }}s...
        <div class="countdown-bar">
          <div class="countdown-fill" :style="{ width: (countdown * 10) + '%' }"></div>
        </div>
      </div>

      <button class="back-link" @click="emit('back')">← Back to series page</button>
    </div>
  </div>
</template>

<style scoped>
.end-screen-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.end-screen-content {
  max-width: 500px;
  width: 100%;
}

.success-icon-wrap {
  margin-bottom: 2rem;
}

.success-icon {
  color: var(--accent);
  animation: scale-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.success-title {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.success-subtitle {
  color: var(--muted);
  font-size: 1.1rem;
  margin-bottom: 3rem;
}

.rating-section {
  margin-bottom: 4rem;
}

.rating-section p {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 1rem;
}

.star-row {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.star-row svg {
  cursor: pointer;
  transition: transform 0.2s;
  color: var(--border);
}

.star-row svg.filled {
  color: var(--accent);
}

.star-row svg:hover {
  transform: scale(1.2);
}

.navigation-options {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-bottom: 2.5rem;
}

.nav-btn {
  padding: 1rem 2rem;
  border-radius: 99px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}

.nav-btn.primary {
  background: var(--accent);
  color: white;
  border: none;
  box-shadow: 0 10px 20px rgba(124, 58, 237, 0.3);
}

.nav-btn.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 25px rgba(124, 58, 237, 0.4);
}

.nav-btn.secondary {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  color: white;
}

.nav-btn.secondary:hover {
  background: rgba(255,255,255,0.1);
}

.caught-up-msg h3 {
  margin: 1rem 0;
}

.notify-btn {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.notify-btn.notified {
  background: var(--accent);
  color: white;
}

.auto-advance-countdown {
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 2rem;
}

.countdown-bar {
  width: 200px;
  height: 4px;
  background: rgba(255,255,255,0.1);
  margin: 0.8rem auto;
  border-radius: 99px;
  overflow: hidden;
}

.countdown-fill {
  height: 100%;
  background: var(--accent);
  transition: width 1s linear;
}

.back-link {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.9rem;
}

.back-link:hover {
  text-decoration: underline;
  color: white;
}

@keyframes scale-up {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

@media (max-width: 600px) {
  .navigation-options { flex-direction: column; }
  .nav-btn { width: 100%; justify-content: center; }
  .success-title { font-size: 1.8rem; }
}
</style>

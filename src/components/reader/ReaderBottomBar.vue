<script setup>
import { ref, computed } from 'vue';
import { ChevronLeft, ChevronRight, List, Maximize } from 'lucide-vue-next';

const props = defineProps({
    currentPage: Number,
    totalPages: Number,
    currentChapterNum: [String, Number],
    allChapters: Array,
    hasPrev: Boolean,
    hasNext: Boolean,
    isVisible: Boolean
});

const emit = defineEmits(['navigate', 'jump', 'select-chapter']);

const showChapterList = ref(false);

const progress = computed(() => {
    if (props.totalPages === 0) return 0;
    return (props.currentPage / props.totalPages) * 100;
});

const sortedChapters = computed(() => {
    return [...props.allChapters].sort((a, b) => parseFloat(b.chapter_number) - parseFloat(a.chapter_number));
});

const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const targetPage = Math.floor(percent * props.totalPages);
    emit('jump', targetPage);
};
</script>

<template>
  <div class="reader-bottom-bar reader-ui" :class="{ 'hidden': !isVisible, 'visible': isVisible, 'bottom': true }">
    <div class="bottom-bar-content glass">
      
      <!-- Progress Track -->
      <div class="progress-container" @click="handleProgressClick">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
        <div class="page-count">{{ currentPage }} / {{ totalPages }}</div>
      </div>

      <div class="controls-row">
        <div class="ctrl-left">
           <button class="nav-btn" :disabled="!hasPrev" @click="emit('navigate', 'prev')" :class="{ 'disabled': !hasPrev }">
             <ChevronLeft :size="24" />
           </button>
           <div class="chapter-info" @click="showChapterList = !showChapterList">
             <span class="label">CHAPTER</span>
             <span class="value">{{ currentChapterNum }} <List :size="14" /></span>
           </div>
           <button class="nav-btn" :disabled="!hasNext" @click="emit('navigate', 'next')" :class="{ 'disabled': !hasNext }">
             <ChevronRight :size="24" />
           </button>
        </div>

        <div class="ctrl-right">
           <button class="icon-btn" @click="showChapterList = !showChapterList"><List :size="20" /></button>
           <button class="icon-btn" @click="document.documentElement.requestFullscreen()"><Maximize :size="20" /></button>
        </div>
      </div>

      <!-- Chapter Dropdown -->
      <transition name="pop">
        <div v-if="showChapterList" class="chapter-dropdown glass">
          <div class="dropdown-header">Jump to Chapter</div>
          <div class="chapter-list-scroll">
            <div v-for="ch in sortedChapters" 
                 :key="ch.id" 
                 class="chapter-item"
                 :class="{ 'active': ch.chapter_number == currentChapterNum }"
                 @click="emit('select-chapter', ch); showChapterList = false;">
              <span>Chapter {{ ch.chapter_number }}</span>
              <span class="ch-date" v-if="ch.release_date">{{ new Date(ch.release_date).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- Backdrop for dropdown -->
    <div v-if="showChapterList" class="dropdown-overlay" @click="showChapterList = false"></div>
  </div>
</template>

<style scoped>
.reader-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  z-index: 1001;
  pointer-events: none;
}

.bottom-bar-content {
  max-width: 800px;
  margin: 0 auto;
  pointer-events: all;
  padding: 1rem;
  border-radius: 20px;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.5);
}

.progress-container {
  height: 24px;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 1rem;
  border: 1px solid var(--border);
}

.progress-bar {
  position: absolute;
  inset: 0;
  background: var(--accent);
  width: 0%;
  transition: width 0.3s ease;
}

.page-count {
  position: relative;
  width: 100%;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 24px;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  pointer-events: none;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ctrl-left { display: flex; align-items: center; gap: 1.5rem; }
.chapter-info { text-align: center; cursor: pointer; padding: 0.2rem 1rem; border-radius: 12px; transition: background 0.2s; }
.chapter-info:hover { background: rgba(255,255,255,0.05); }
.chapter-info .label { display: block; font-size: 0.6rem; color: var(--muted); font-weight: 700; }
.chapter-info .value { font-size: 1.1rem; font-weight: 900; display: flex; align-items: center; gap: 0.4rem; justify-content: center; }

.nav-btn { background: none; border: none; color: white; cursor: pointer; }
.nav-btn.disabled { opacity: 0.2; cursor: not-allowed; }

.ctrl-right { display: flex; gap: 1rem; }
.icon-btn { background: none; border: none; color: white; cursor: pointer; padding: 0.5rem; }

/* Dropdown */
.chapter-dropdown {
  position: absolute;
  bottom: calc(100% + 15px);
  left: 0;
  right: 0;
  max-height: 400px;
  border-radius: 20px;
  padding: 1.5rem;
  z-index: 10;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -20px 50px rgba(0,0,0,0.6);
}

.dropdown-header { font-weight: 800; margin-bottom: 1rem; color: var(--accent); }
.chapter-list-scroll { overflow-y: auto; flex: 1; margin-right: -10px; padding-right: 10px; }
.chapter-item { padding: 0.8rem 1rem; border-radius: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.2rem; }
.chapter-item:hover { background: rgba(255,255,255,0.05); }
.chapter-item.active { background: var(--accent); color: white; }
.ch-date { font-size: 0.7rem; opacity: 0.6; }

.dropdown-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; }

.pop-enter-active, .pop-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pop-enter-from { opacity: 0; transform: translateY(20px) scale(0.95); }
.pop-leave-to { opacity: 0; transform: translateY(20px) scale(0.95); }

@media (max-width: 600px) {
  .bottom-bar-content { border-radius: 0; margin: 0 -1.5rem; max-width: 100vw; padding: 1rem 1.5rem; }
  .chapter-dropdown { border-radius: 0; bottom: 100%; }
}
</style>

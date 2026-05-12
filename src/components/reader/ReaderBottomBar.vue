<script setup>
import { ChevronLeft, ChevronRight, List, Maximize } from 'lucide-vue-next';
import { ref, computed } from 'vue';

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

const toggleFullscreen = () => {
    const doc = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (doc.requestFullscreen) doc.requestFullscreen();
        else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();
        emit('hide-ui');
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
};
</script>

<template>
  <div class="reader-bottom-bar reader-ui" :class="{ 'hidden': !isVisible, 'visible': isVisible, 'bottom': true }">
    <div class="bottom-bar-content comic-panel">
      
      <!-- Progress Track Brutalist -->
      <div class="progress-container" @click="handleProgressClick">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
        <div class="page-count">PG {{ currentPage }} / {{ totalPages }}</div>
      </div>

      <div class="controls-row">
        <div class="ctrl-left">
           <button class="comic-button nav-btn" :disabled="!hasPrev" @click="emit('navigate', 'prev')" :class="{ 'disabled': !hasPrev }">
             <ChevronLeft :size="24" strokeWidth="3" />
           </button>
           <div class="chapter-info comic-panel" @click="showChapterList = !showChapterList">
             <span class="value">CH. {{ currentChapterNum }} <List :size="18" strokeWidth="2.5" /></span>
           </div>
           <button class="comic-button nav-btn" :disabled="!hasNext" @click="emit('navigate', 'next')" :class="{ 'disabled': !hasNext }">
             <ChevronRight :size="24" strokeWidth="3" />
           </button>
        </div>

        <div class="ctrl-right">
           <button class="comic-button secondary icon-btn" @click="toggleFullscreen"><Maximize :size="20" strokeWidth="2.5" /></button>
        </div>
      </div>

      <!-- Chapter Dropdown -->
      <transition name="pop">
        <div v-if="showChapterList" class="chapter-dropdown comic-panel">
          <div class="dropdown-header">SELECT ISSUE</div>
          <div class="chapter-list-scroll">
            <div v-for="ch in sortedChapters" 
                 :key="ch.id" 
                 class="chapter-item"
                 :class="{ 'active': ch.chapter_number == currentChapterNum }"
                 @click="emit('select-chapter', ch); showChapterList = false;">
              <span>ISSUE #{{ ch.chapter_number }}</span>
              <span class="ch-date" v-if="ch.release_date">{{ new Date(ch.release_date).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </transition>
    </div>

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
  padding: 1.5rem;
  background: var(--surface);
  position: relative;
}

.progress-container {
  height: 28px;
  background: var(--bg);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 1.5rem;
  border: var(--border-w) solid var(--border);
}

.progress-bar {
  position: absolute;
  inset: 0;
  background: var(--accent);
  width: 0%;
  transition: width 0.3s ease;
  border-right: var(--border-w) solid var(--border);
}

.page-count {
  position: relative;
  width: 100%;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 900;
  line-height: 24px;
  color: var(--text);
  pointer-events: none;
  mix-blend-mode: difference; /* Cool comic effect */
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ctrl-left { display: flex; align-items: stretch; gap: 1rem; }

.nav-btn { padding: 8px 12px; box-shadow: 3px 3px 0px var(--border); }
.nav-btn.disabled { background: var(--bg); color: var(--text-secondary); cursor: not-allowed; box-shadow: none; transform: none !important; border-color: var(--text-secondary); }

.chapter-info { 
    display: flex; align-items: center; cursor: pointer; padding: 0 1.5rem; 
    background: var(--yellow); box-shadow: 3px 3px 0 var(--border); transition: all 0.2s;
}
.chapter-info:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--border); }
.chapter-info .value { font-size: 1.2rem; font-weight: 900; display: flex; align-items: center; gap: 0.8rem; justify-content: center; }

.ctrl-right { display: flex; gap: 1rem; }
.icon-btn { padding: 8px; box-shadow: 3px 3px 0px var(--border); }

/* Dropdown */
.chapter-dropdown {
  position: absolute;
  bottom: calc(100% + 20px);
  left: 0;
  right: 0;
  max-height: 400px;
  padding: 1.5rem;
  z-index: 10;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dropdown-header { font-weight: 900; font-size: 1.5rem; margin-bottom: 1rem; border-bottom: var(--border-w) solid var(--border); padding-bottom: 0.5rem; }
.chapter-list-scroll { overflow-y: auto; flex: 1; margin-right: -10px; padding-right: 10px; }
.chapter-item { padding: 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 1rem; border-bottom: 2px solid var(--border); }
.chapter-item:hover { background: var(--yellow); }
.chapter-item.active { background: var(--accent); color: white; }
.ch-date { font-size: 0.8rem; font-weight: 900; }

.dropdown-overlay { position: fixed; inset: 0; z-index: 1000; }

.pop-enter-active, .pop-leave-active { transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(20px); }

@media (max-width: 600px) {
  .bottom-bar-content { margin: 0 -1.5rem -1.5rem; max-width: 100vw; padding: 1.5rem 1rem; border-bottom: none; border-left: none; border-right: none; box-shadow: none; border-top: var(--border-w) solid var(--border); }
  .chapter-info { padding: 0 1rem; }
  .chapter-dropdown { border-radius: 0; bottom: 100%; border-left: none; border-right: none; }
}
</style>

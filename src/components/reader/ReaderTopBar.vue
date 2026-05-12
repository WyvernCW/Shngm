<script setup>
import { ref, onMounted, computed } from 'vue';
import { ArrowLeft, Bookmark, BookmarkCheck, Settings, Bell, Share2 } from 'lucide-vue-next';

const props = defineProps({
    series: Object,
    chapterNumber: [String, Number],
    isVisible: Boolean
});

const emit = defineEmits(['open-settings']);

const isBookmarked = ref(false);
const isNotifying = ref(false);

onMounted(() => {
    if (props.series?.manga_id) {
        const bookmarks = JSON.parse(localStorage.getItem('vrtwel_bookmarks') || '[]');
        isBookmarked.value = bookmarks.includes(props.series.manga_id);
        isNotifying.value = localStorage.getItem(`vrtwel_notify_${props.series.manga_id}`) === 'true';
    }
});

const toggleBookmark = () => {
    if (!props.series?.manga_id) return;
    const bookmarks = JSON.parse(localStorage.getItem('vrtwel_bookmarks') || '[]');
    const index = bookmarks.indexOf(props.series.manga_id);

    if (index > -1) {
        bookmarks.splice(index, 1);
        isBookmarked.value = false;
        showToast('REMOVED FROM STASH');
    } else {
        bookmarks.push(props.series.manga_id);
        isBookmarked.value = true;
        showToast('ADDED TO STASH');
    }
    localStorage.setItem('vrtwel_bookmarks', JSON.stringify(bookmarks));
};

const toggleNotify = () => {
    if (!props.series?.manga_id) return;
    isNotifying.value = !isNotifying.value;
    localStorage.setItem(`vrtwel_notify_${props.series.manga_id}`, isNotifying.value);
    showToast(isNotifying.value ? 'NOTIFICATIONS ON' : 'NOTIFICATIONS OFF');
};

const goBack = () => {
    if (props.series?.manga_id) {
        window.location.hash = `#/series/${props.series.manga_id}`;
    } else {
        window.location.hash = '#/';
    }
};

const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'top-toast comic-panel animate-slide-in';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
};

const shareChapter = () => {
    if (navigator.share) {
        navigator.share({
            title: `${props.series?.title} - Ch ${props.chapterNumber}`,
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('LINK COPIED');
    }
};
</script>

<template>
  <div class="reader-top-bar reader-ui" :class="{ 'hidden': !isVisible, 'visible': isVisible }">
    <div class="top-bar-content comic-panel">
      <div class="bar-left">
        <button class="comic-button secondary icon-btn" @click="goBack"><ArrowLeft :size="20" strokeWidth="3" /></button>
        <div class="series-info">
          <h1 class="bar-title">{{ series?.title || 'LOADING...' }}</h1>
          <span class="bar-subtitle">ISSUE #{{ chapterNumber }}</span>
        </div>
      </div>

      <div class="bar-right">
        <button class="icon-btn-raw" :class="{ 'active': isNotifying }" @click="toggleNotify">
          <Bell :size="24" strokeWidth="2.5" :fill="isNotifying ? 'currentColor' : 'none'" />
        </button>
        <button class="icon-btn-raw" @click="shareChapter"><Share2 :size="24" strokeWidth="2.5" /></button>
        <button class="icon-btn-raw" @click="toggleBookmark">
          <BookmarkCheck v-if="isBookmarked" :size="24" strokeWidth="2.5" class="text-accent" />
          <Bookmark v-else :size="24" strokeWidth="2.5" />
        </button>
        <div class="divider"></div>
        <button class="icon-btn-raw" @click="emit('open-settings')">
          <Settings :size="24" strokeWidth="2.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reader-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  z-index: 1000;
  pointer-events: none;
}

.top-bar-content {
  max-width: 1000px;
  margin: 0 auto;
  pointer-events: all;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--surface);
}

.bar-left { display: flex; align-items: center; gap: 1rem; }
.series-info { display: flex; flex-direction: column; }
.bar-title { font-size: 1.1rem; font-weight: 900; margin: 0; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; color: var(--text); }
.bar-subtitle { font-size: 0.8rem; color: var(--accent); font-weight: 900; }

.icon-btn { padding: 8px; box-shadow: 2px 2px 0px var(--border); border-radius: 0; }

.bar-right { display: flex; align-items: center; gap: 0.8rem; }
.icon-btn-raw { 
  background: none; border: none; color: var(--text); cursor: pointer; padding: 0.5rem; display: flex; align-items: center; justify-content: center; transition: all 0.1s; 
}
.icon-btn-raw:hover { color: var(--accent); transform: scale(1.1); }
.icon-btn-raw.active { color: var(--accent); }

.divider { width: 3px; height: 24px; background: var(--border); margin: 0 0.5rem; }

.text-accent { color: var(--accent); }

@media (max-width: 600px) {
  .top-bar-content { border-radius: 0; margin: -1rem; max-width: 100vw; border-left: none; border-right: none; border-top: none; }
  .bar-title { max-width: 150px; }
  .bar-right button:nth-child(1), .bar-right button:nth-child(2) { display: none; }
}
</style>

<style>
.top-toast {
    position: fixed;
    top: 5rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--yellow);
    color: var(--text);
    padding: 0.8rem 1.5rem;
    font-weight: 900;
    font-size: 1rem;
    z-index: 9999;
}
.animate-slide-in {
    animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes slideIn {
    from { opacity: 0; transform: translate(-50%, -20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
}
</style>

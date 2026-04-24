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
        showToast('Removed from library');
    } else {
        bookmarks.push(props.series.manga_id);
        isBookmarked.value = true;
        showToast('Added to library');
    }
    localStorage.setItem('vrtwel_bookmarks', JSON.stringify(bookmarks));
};

const toggleNotify = () => {
    if (!props.series?.manga_id) return;
    isNotifying.value = !isNotifying.value;
    localStorage.setItem(`vrtwel_notify_${props.series.manga_id}`, isNotifying.value);
    showToast(isNotifying.value ? 'Notifications ON' : 'Notifications OFF');
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
    toast.className = 'top-toast animate-slide-in';
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
        showToast('Link copied to clipboard');
    }
};
</script>

<template>
  <div class="reader-top-bar reader-ui" :class="{ 'hidden': !isVisible, 'visible': isVisible }">
    <div class="top-bar-content glass">
      <div class="bar-left">
        <button class="icon-btn" @click="goBack"><ArrowLeft :size="20" /></button>
        <div class="series-info">
          <h1 class="bar-title">{{ series?.title || 'Loading...' }}</h1>
          <span class="bar-subtitle">Chapter {{ chapterNumber }}</span>
        </div>
      </div>

      <div class="bar-right">
        <button class="icon-btn" :class="{ 'active': isNotifying }" @click="toggleNotify">
          <Bell :size="19" :fill="isNotifying ? 'currentColor' : 'none'" />
        </button>
        <button class="icon-btn" @click="shareChapter"><Share2 :size="19" /></button>
        <button class="icon-btn" @click="toggleBookmark">
          <BookmarkCheck v-if="isBookmarked" :size="20" class="text-accent" />
          <Bookmark v-else :size="20" />
        </button>
        <div class="divider"></div>
        <button class="icon-btn" @click="emit('open-settings')">
          <Settings :size="20" />
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
  padding: 0.7rem 1.5rem;
  border-radius: 99px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}

.bar-left { display: flex; align-items: center; gap: 1rem; }
.series-info { display: flex; flex-direction: column; }
.bar-title { font-size: 0.95rem; font-weight: 800; margin: 0; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-subtitle { font-size: 0.75rem; color: var(--muted); font-weight: 600; }

.bar-right { display: flex; align-items: center; gap: 0.6rem; }
.icon-btn { 
  background: none; border: none; color: white; cursor: pointer; padding: 0.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; 
}
.icon-btn:hover { background: rgba(255,255,255,0.1); }
.icon-btn.active { color: var(--accent); }

.divider { width: 1px; height: 20px; background: var(--border); margin: 0 0.4rem; }

.text-accent { color: var(--accent); }

@media (max-width: 600px) {
  .bar-title { max-width: 120px; }
  .bar-right button:nth-child(2) { display: none; }
}
</style>
<style>
.top-toast {
    position: fixed;
    top: 5rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: white;
    padding: 0.6rem 1.5rem;
    border-radius: 99px;
    font-weight: 700;
    font-size: 0.85rem;
    z-index: 9999;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
}
.animate-slide-in {
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideIn {
    from { opacity: 0; transform: translate(-50%, -20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
}
</style>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { Download, Check, Loader2, ArrowDownToLine } from 'lucide-vue-next';
import { API } from '../api.js';
import { Downloader } from '../downloader.js';

const props = defineProps({
  params: Object
});

const mangaId = computed(() => props.params.parts[0]);
const detail = ref(null);
const chapters = ref([]);
const isLoading = ref(true);
const isBookmarked = ref(false);

const formatTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
};

const loadData = async () => {
    if (!mangaId.value) return;
    isLoading.value = true;
    try {
        const [dRes, cRes] = await Promise.all([
            API.getDetail(mangaId.value),
            API.getChapterList(mangaId.value)
        ]);
        detail.value = dRes?.data;
        chapters.value = cRes?.data || [];
        
        const bookmarks = JSON.parse(localStorage.getItem('vrtwel_bookmarks') || '[]');
        isBookmarked.value = bookmarks.includes(mangaId.value);
    } catch (e) {
        console.error(e);
    } finally {
        isLoading.value = false;
    }
};

watch(mangaId, loadData, { immediate: true });

const toggleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('vrtwel_bookmarks') || '[]');
    const index = bookmarks.indexOf(mangaId.value);
    if (index > -1) {
        bookmarks.splice(index, 1);
        isBookmarked.value = false;
    } else {
        bookmarks.push(mangaId.value);
        isBookmarked.value = true;
    }
    localStorage.setItem('vrtwel_bookmarks', JSON.stringify(bookmarks));
};

const resolveImg = (m) => API.resolveImg(m);

const downloadedChaps = ref(new Set());
const dlProgress = ref({});
const globalProgress = ref(0);
const isDownloadingAll = ref(false);

const checkDownloaded = async () => {
    const list = await Downloader.getDownloadedChapters(mangaId.value);
    downloadedChaps.value = new Set(list.map(c => c.chapter_id));
};

watch(chapters, () => {
    if (chapters.value.length > 0) checkDownloaded();
});

const startDownload = async (chapter) => {
    const chId = chapter.chapter_id || chapter.id;
    if (downloadedChaps.value.has(chId)) return;
    
    dlProgress.value[chId] = '0%';
    try {
        await Downloader.downloadChapter(detail.value, chapter, (curr, total) => {
            dlProgress.value[chId] = Math.round((curr/total)*100) + '%';
        });
        downloadedChaps.value.add(chId);
        dlProgress.value[chId] = 'DONE';
    } catch(e) {
        dlProgress.value[chId] = 'ERR';
        console.error(e);
    }
};

const downloadAll = async () => {
    if (isDownloadingAll.value) return;
    isDownloadingAll.value = true;
    const toDownload = chapters.value.filter(ch => !downloadedChaps.value.has(ch.chapter_id || ch.id));
    for (let i = 0; i < toDownload.length; i++) {
        globalProgress.value = Math.round((i / toDownload.length) * 100);
        await startDownload(toDownload[i]);
    }
    globalProgress.value = 100;
    setTimeout(() => { isDownloadingAll.value = false; globalProgress.value = 0; }, 2000);
};
</script>

<template>
  <div class="series-view">
    <div v-if="isLoading" class="loader-wrap"><div class="loader"></div></div>
    
    <template v-else-if="detail">
      <!-- Brutalist Header Section -->
      <div class="series-header comic-panel">
        
        <div class="header-layout">
          <div class="poster-container">
             <img :src="resolveImg(detail)" alt="Poster" class="poster-img comic-panel">
          </div>
          
          <div class="meta-container">
            <h1 class="series-title">{{ detail.title }}</h1>
            
            <div class="info-grid">
               <div class="info-box comic-panel">
                   <span class="label">FORMAT</span>
                   <span class="val">{{ detail.taxonomy?.Format?.[0]?.name || 'Manhwa' }}</span>
               </div>
               <div class="info-box comic-panel" :style="{ background: detail.status === 1 ? 'var(--green)' : 'var(--blue)', color: 'white' }">
                   <span class="label" style="color: black;">STATUS</span>
                   <span class="val">{{ detail.status === 1 ? 'ONGOING' : 'COMPLETED' }}</span>
               </div>
               <div class="info-box comic-panel" style="background: var(--yellow);">
                   <span class="label">RATING</span>
                   <span class="val">★ {{ parseFloat(detail.user_rate || 5).toFixed(1) }}</span>
               </div>
            </div>

            <p class="synopsis">{{ detail.description || 'No description available.' }}</p>

            <div class="action-row">
              <a v-if="chapters.length > 0" 
                 :href="`#/read/${chapters[chapters.length-1]?.chapter_id}/${chapters[chapters.length-1]?.chapter_number}`" 
                 class="comic-button">
                READ FIRST CHAPTER
              </a>
              <button class="comic-button secondary" @click="toggleBookmark">
                {{ isBookmarked ? '✓ SAVED' : '+ ADD TO STASH' }}
              </button>
              <div class="dl-group">
                  <button class="comic-button action" @click="downloadAll" :disabled="isDownloadingAll || chapters.length === 0">
                    <ArrowDownToLine size="20" style="margin-right: 8px;" />
                    {{ isDownloadingAll ? `DOWNLOADING... ${globalProgress}%` : 'DOWNLOAD ALL' }}
                  </button>
                  <span v-if="chapters.length > 0" class="dl-est">~{{ Downloader.estimateSize(chapters.length) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Genres -->
      <div class="genre-wrap">
           <a v-for="g in detail.taxonomy?.Genre" :key="g.slug" :href="`#/all?genre=${g.slug}`" class="genre-tag comic-panel">
               #{{ g.name.toUpperCase() }}
           </a>
      </div>

      <!-- Chapters List -->
      <div class="chapters-section">
        <h2 class="section-title">ISSUES ({{ chapters.length }})</h2>
        
        <div class="chapter-grid">
           <div v-for="(ch, i) in chapters" :key="ch.id" class="chapter-card comic-panel">
              <a :href="`#/read/${ch.chapter_id || ch.id}/${ch.chapter_number}`" class="ch-link">
                 <span class="ch-num">CH. {{ ch.chapter_number }}</span>
                 <span class="ch-date">{{ formatTime(ch.release_date) }}</span>
              </a>
              <button class="ch-dl-btn" @click.prevent="startDownload(ch)" :disabled="dlProgress[ch.chapter_id || ch.id] || downloadedChaps.has(ch.chapter_id || ch.id)">
                 <Check v-if="downloadedChaps.has(ch.chapter_id || ch.id)" size="18" strokeWidth="3" />
                 <span v-else-if="dlProgress[ch.chapter_id || ch.id] && dlProgress[ch.chapter_id || ch.id] !== 'ERR'">{{ dlProgress[ch.chapter_id || ch.id] }}</span>
                 <Download v-else size="18" strokeWidth="2.5" />
              </button>
           </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dl-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.dl-est {
  font-weight: 900;
  font-size: 0.8rem;
  opacity: 0.6;
}
.comic-button.action {
  background: var(--yellow);
  color: black;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ch-link {
  display: flex;
  flex-direction: column;
  flex: 1;
  text-decoration: none;
  color: inherit;
}
.ch-dl-btn {
  background: transparent;
  border: 2px solid var(--border);
  color: var(--text);
  font-weight: 900;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  border-radius: 4px;
}
.ch-dl-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chapter-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.series-view {
  max-width: 1200px;
  margin: 0 auto;
}

.series-header {
  padding: 3rem;
  background: var(--surface);
  margin-bottom: 2rem;
}

.header-layout {
  display: flex;
  gap: 4rem;
}

.poster-container {
  width: 300px;
  flex-shrink: 0;
}

.poster-img {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  transform: rotate(-2deg);
  transform-origin: bottom left;
}

.meta-container {
  flex: 1;
}

.series-title {
  font-size: 3.5rem;
  font-weight: 900;
  text-transform: uppercase;
  line-height: 1;
  letter-spacing: -2px;
  margin-bottom: 2rem;
  color: var(--text);
  text-shadow: 3px 3px 0px var(--border);
}

.info-grid {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.info-box {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
}

.info-box .label {
  font-size: 0.7rem;
  font-weight: 900;
  opacity: 0.8;
  margin-bottom: 2px;
}

.info-box .val {
  font-size: 1.2rem;
  font-weight: 900;
}

.synopsis {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 2.5rem;
  padding: 1.5rem;
  border-left: 6px solid var(--accent);
  background: var(--bg);
}

.action-row {
  display: flex;
  gap: 1.5rem;
}

.genre-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 4rem;
}

.genre-tag {
  background: var(--bg);
  padding: 8px 16px;
  font-weight: 900;
  font-size: 0.9rem;
}
.genre-tag:hover {
    background: var(--yellow);
}

.section-title {
  font-size: 2.5rem;
  font-weight: 900;
  text-transform: uppercase;
  margin-bottom: 2rem;
  border-bottom: var(--border-w) solid var(--border);
  padding-bottom: 1rem;
}

.chapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.chapter-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  background: var(--surface);
}

.chapter-card:hover {
  background: var(--accent);
  color: white;
}

.chapter-card:hover .ch-date {
  color: rgba(255,255,255,0.8);
}

.ch-num {
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 4px;
}

.ch-date {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .header-layout { flex-direction: column; align-items: center; gap: 2rem; text-align: center; }
  .poster-container { width: 240px; }
  .series-title { font-size: 2.5rem; text-shadow: 2px 2px 0px var(--border); }
  .info-grid { justify-content: center; }
  .synopsis { text-align: left; }
  .action-row { justify-content: center; flex-wrap: wrap; }
}

@media (max-width: 480px) {
  .series-header { padding: 1.5rem; margin: -1rem -1rem 2rem; border-left: none; border-right: none; }
  .chapter-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
  .ch-num { font-size: 1.2rem; }
}
</style>

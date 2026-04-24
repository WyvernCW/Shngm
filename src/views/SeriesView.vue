<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { API } from '../api.js';
import { Bookmark, BookmarkCheck, Play, List, Clock, Star, ArrowLeft } from 'lucide-vue-next';

import ChapterListItem from '../components/ChapterListItem.vue';

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
        
        // Check bookmark
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
</script>

<template>
  <div class="series-view animate">
    <div v-if="isLoading" class="loader-wrap"><div class="loader"></div></div>
    
    <template v-else-if="detail">
      <div class="series-header">
        <div class="header-bg" :style="{ backgroundImage: `url(${resolveImg(detail)})` }"></div>
        <div class="header-overlay"></div>
        
        <div class="header-content">
          <div class="series-poster">
            <img :src="resolveImg(detail)" alt="Poster" class="poster-img">
          </div>
          
          <div class="series-meta-main">
            <div class="meta-badges">
              <span class="badge format">{{ detail.taxonomy?.Format?.[0]?.name || 'Manhwa' }}</span>
              <span class="badge" :class="detail.status === 1 ? 'ongoing' : 'completed'">
                {{ detail.status === 1 ? 'Ongoing' : 'Completed' }}
              </span>
              <span v-if="detail.source" class="source-tag">{{ detail.source }}</span>
            </div>
            
            <h1 class="series-title-large">{{ detail.title }}</h1>
            
            <div class="genre-pills">
              <a v-for="g in detail.taxonomy?.Genre" :key="g.slug" 
                 :href="`#/all?genre=${g.slug}`" class="genre-pill">
                {{ g.name }}
              </a>
            </div>

            <div class="action-buttons">
              <a v-if="chapters.length > 0" 
                 :href="`#/read/${chapters[chapters.length-1]?.chapter_id}/${chapters[chapters.length-1]?.chapter_number}`" 
                 class="btn-primary" style="text-decoration:none;">
                <Play :size="18" fill="white" /> Start Reading
              </a>
              <button class="btn-outline-glass" @click="toggleBookmark">
                <BookmarkCheck v-if="isBookmarked" :size="18" class="text-accent" />
                <Bookmark v-else :size="18" />
                {{ isBookmarked ? 'In Library' : 'Save to Library' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="series-body">
        <div class="body-left">
          <section class="info-section">
            <h2 class="sub-heading"><List :size="20" /> Synopsis</h2>
            <p class="summary-text">{{ detail.description || 'No description available.' }}</p>
          </section>

          <section class="chapters-section">
            <div class="section-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
              <h2 class="sub-heading" style="margin-bottom:0;"><Clock :size="20" /> Chapters ({{ chapters.length }})</h2>
            </div>
            
            <div class="chapter-list">
              <ChapterListItem 
                v-for="ch in chapters" 
                :key="ch.id"
                :title="`Chapter ${ch.chapter_number}`"
                :time="formatTime(ch.release_date)"
                :href="`#/read/${ch.chapter_id || ch.id}/${ch.chapter_number}`"
              />
            </div>
          </section>
        </div>

        <div class="body-right">
          <div class="stats-card glass">
            <div class="stat-item">
              <span class="stat-label">Rating</span>
              <span class="stat-val"><Star :size="16" :fill="'var(--gold)'" /> {{ parseFloat(detail.user_rate || 5).toFixed(1) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Author</span>
              <span class="stat-val">{{ detail.author || 'N/A' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Format</span>
              <span class="stat-val">{{ detail.type || 'Manhwa' }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.series-view { margin: -2rem; }

.series-header {
  position: relative;
  height: 520px;
  display: flex;
  align-items: flex-end;
  padding: 4rem;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 20%;
  filter: blur(50px) brightness(0.2);
  transform: scale(1.1);
}

.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, var(--bg) 0%, transparent 100%);
}

.header-content {
  position: relative;
  display: flex;
  gap: 3.5rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  z-index: 10;
}

.poster-img {
  width: 260px;
  height: 380px;
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.6);
  border: 1px solid var(--border);
}

.series-meta-main { flex: 1; padding-bottom: 2rem; }
.series-title-large { font-size: 3.2rem; font-weight: 800; margin: 1rem 0 2rem; line-height: 1.1; letter-spacing: -1px; }

.badge { padding: 0.3rem 0.7rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
.badge.format { background: var(--card-bg); color: var(--text-secondary); border: 1px solid var(--border); }
.badge.ongoing { background: rgba(59, 130, 246, 0.15); color: var(--info); border: 1px solid rgba(59, 130, 246, 0.3); }
.badge.completed { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); }
.source-tag { background: rgba(220, 38, 38, 0.15); color: var(--accent); padding: 0.3rem 0.7rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; border: 1px solid rgba(220, 38, 38, 0.3); }

.genre-pills { display: flex; flex-wrap: wrap; gap: 0.6rem; margin: 1.5rem 0; }
.genre-pill { padding: 0.5rem 1.4rem; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 99px; font-size: 0.85rem; font-weight: 700; color: var(--accent); transition: all 0.2s; }
.genre-pill:hover { background: var(--accent); color: white; transform: translateY(-3px); }

.action-buttons { display: flex; gap: 1.2rem; margin-top: 2.5rem; }
.btn-outline-glass { 
  background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: white; padding: 0.8rem 1.8rem; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 0.7rem; font-weight: 700; transition: all 0.2s;
}
.btn-outline-glass:hover { background: rgba(255,255,255,0.1); border-color: white; }

.series-body {
  max-width: 1200px;
  margin: 4rem auto;
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 5rem;
  padding: 0 2rem;
}

.sub-heading { font-size: 1.6rem; font-weight: 800; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.8rem; }
.summary-text { line-height: 1.85; color: var(--muted); font-size: 1.1rem; }

.chapter-list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; margin-top: 1rem; }
.chapter-row-card { padding: 1.4rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
.chapter-row-card:hover { border-color: var(--accent); background: rgba(220, 38, 38, 0.05); transform: translateX(8px); }
.ch-num { display: block; font-weight: 800; font-size: 1.15rem; }
.ch-date { font-size: 0.75rem; color: var(--muted); margin-top: 0.2rem; display: block; }

.stats-card { padding: 2rem; border-radius: 20px; display: flex; flex-direction: column; gap: 1.8rem; border: 1px solid var(--border); }
.stat-item { display: flex; justify-content: space-between; align-items: center; }
.stat-label { color: var(--muted); font-weight: 600; font-size: 0.9rem; }
.stat-val { font-weight: 800; display: flex; align-items: center; gap: 0.4rem; }

@media (max-width: 1024px) {
  .series-view { margin: 0; }
  .series-header { height: auto; padding: 5rem 1.5rem 3rem; align-items: center; }
  .header-content { flex-direction: column; align-items: center; text-align: center; gap: 2.5rem; }
  .poster-img { width: 200px; height: 300px; }
  .series-title-large { font-size: 2.5rem; }
  .genre-pills { justify-content: center; }
  .action-buttons { justify-content: center; }
  .series-body { grid-template-columns: 1fr; gap: 4rem; padding: 3rem 1.5rem; }
  .stats-card { order: -1; }
}
</style>

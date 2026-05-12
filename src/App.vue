<script setup>
import { ref, onMounted, onUnmounted, shallowRef, computed } from 'vue';
import HomeView from './views/HomeView.vue';
import AllSeriesView from './views/AllSeriesView.vue';
import TrendingView from './views/TrendingView.vue';
import LibraryView from './views/LibraryView.vue';
import SeriesView from './views/SeriesView.vue';
import ReaderView from './views/ReaderView.vue';
import SearchView from './views/SearchView.vue';
import { BookOpen, Flame, Compass, Library, Search } from 'lucide-vue-next';

const currentView = shallowRef(HomeView);
const currentParams = ref({ parts: [], queryParams: {} });
const isMobileMenuOpen = ref(false);
const currentHash = ref(window.location.hash || '#/');
console.log("APP_VERSION: 1.1");

const handleRoute = () => {
    const hash = window.location.hash || '#/';
    currentHash.value = hash;
    
    const [rawPath, ...parts] = hash.replace('#/', '').split('/');
    const [path, queryStr] = rawPath.split('?');
    const queryParams = Object.fromEntries(new URLSearchParams(queryStr || ''));

    currentParams.value = { parts, queryParams };

    if (!path || path === 'home' || path === '') currentView.value = HomeView;
    else if (path === 'all')       currentView.value = AllSeriesView;
    else if (path === 'trending')  currentView.value = TrendingView;
    else if (path === 'library')   currentView.value = LibraryView;
    else if (path === 'series')    currentView.value = SeriesView;
    else if (path === 'read')      currentView.value = ReaderView;
    else if (path === 'search')    currentView.value = SearchView;

    window.scrollTo({ top: 0 });
    isMobileMenuOpen.value = false;
};

onMounted(() => {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
});

onUnmounted(() => {
    window.removeEventListener('hashchange', handleRoute);
});

const isReader = computed(() => currentView.value === ReaderView);

const navigateTo = (path) => {
    window.location.hash = path;
};
</script>

<template>
  <div class="app-container" :class="{ 'is-reader': isReader }">

    <!-- Desktop Sidebar -->
    <nav v-if="!isReader" class="sidebar-comic">
      <div class="rail-header">
        <img src="/assets/logo.png" class="logo-box" alt="VRTWEL Logo" />
        <div class="wordmark">
          <span>VRTWEL</span>
          <span class="wm-sub">COMICS</span>
        </div>
      </div>

      <div class="rail-nav">
        <a href="#/" class="nav-btn" :class="{ active: currentView === HomeView }" title="Home">
          <BookOpen :size="24" strokeWidth="2.5" />
          <span class="link-label">HOME</span>
        </a>
        <a href="#/trending" class="nav-btn" :class="{ active: currentView === TrendingView }" title="Trending">
          <Flame :size="24" strokeWidth="2.5" />
          <span class="link-label">HOT</span>
        </a>
        <a href="#/all" class="nav-btn" :class="{ active: currentView === AllSeriesView }" title="Browse">
          <Compass :size="24" strokeWidth="2.5" />
          <span class="link-label">BROWSE</span>
        </a>
        <a href="#/library" class="nav-btn" :class="{ active: currentView === LibraryView }" title="Library">
          <Library :size="24" strokeWidth="2.5" />
          <span class="link-label">LIBRARY</span>
        </a>
      </div>

      <div class="rail-footer">
        <a href="#/search" class="nav-btn" :class="{ active: currentView === SearchView }" title="Search">
          <Search :size="24" strokeWidth="2.5" />
          <span class="link-label">SEARCH</span>
        </a>
      </div>
    </nav>

    <!-- Mobile Header -->
    <header v-if="!isReader" class="mobile-header">
      <div class="mobile-header-left" @click="navigateTo('#/')" style="cursor: pointer;">
        <img src="/assets/logo.png" class="logo-box" alt="VRTWEL Logo" />
        <span class="mobile-wordmark">VRTWEL</span>
      </div>
      <button class="mobile-search-btn" @click="navigateTo('#/search')">
        <Search :size="24" strokeWidth="2.5" />
      </button>
    </header>

    <!-- Main View Content -->
    <main class="view-content" :class="{ 'full-width': isReader }">
      <component :is="currentView" :params="currentParams" />
    </main>

    <!-- Mobile Navigation -->
    <nav v-if="!isReader" class="mobile-bottom-nav">
      <a href="#/" class="mobile-tab" :class="{ active: currentView === HomeView }">
        <BookOpen :size="24" strokeWidth="2.5" />
        <span>HOME</span>
      </a>
      <a href="#/trending" class="mobile-tab" :class="{ active: currentView === TrendingView }">
        <Flame :size="24" strokeWidth="2.5" />
        <span>HOT</span>
      </a>
      <a href="#/all" class="mobile-tab" :class="{ active: currentView === AllSeriesView }">
        <Compass :size="24" strokeWidth="2.5" />
        <span>BROWSE</span>
      </a>
      <a href="#/library" class="mobile-tab" :class="{ active: currentView === LibraryView }">
        <Library :size="24" strokeWidth="2.5" />
        <span>STASH</span>
      </a>
      <a href="#/search" class="mobile-tab" :class="{ active: currentView === SearchView }">
        <Search :size="24" strokeWidth="2.5" />
        <span>FIND</span>
      </a>
    </nav>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  min-height: 100vh;
}

/* Desktop Sidebar - Brutalist Comic Panel */
.sidebar-comic {
  width: var(--sidebar-w);
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--surface);
  border-right: var(--border-w) solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
  box-shadow: 4px 0 0 var(--border);
}

.sidebar-comic:hover {
  width: var(--sidebar-w-expand);
}

.rail-header {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 80px;
  border-bottom: var(--border-w) solid var(--border);
  background: var(--accent);
  color: white;
}

.logo-box {
  width: 40px;
  height: 40px;
  background: #000000;
  border: var(--border-w) solid var(--border);
  flex-shrink: 0;
  box-shadow: 3px 3px 0 var(--border);
  object-fit: cover;
  display: block;
}

.wordmark {
  display: flex;
  flex-direction: column;
  line-height: 1;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sidebar-comic:hover .wordmark { opacity: 1; transform: translateX(0); }

.wordmark span { font-weight: 900; font-size: 1.5rem; letter-spacing: -1px; }
.wordmark .wm-sub { font-size: 0.8rem; font-weight: 700; letter-spacing: 2px; color: var(--yellow); }

.rail-nav {
  flex: 1;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  color: var(--text);
  text-decoration: none;
  font-weight: 900;
  transition: all 0.2s;
  border: var(--border-w) solid transparent;
  position: relative;
}

.nav-btn:hover {
  border-color: var(--border);
  background: var(--yellow);
  box-shadow: 4px 4px 0 var(--border);
  transform: translate(-2px, -2px);
}

.nav-btn.active {
  background: #27272a;
  color: white;
  border-color: var(--border);
  box-shadow: 4px 4px 0 var(--accent);
}

.link-label {
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s;
  font-size: 1.1rem;
  letter-spacing: 1px;
}

.sidebar-comic:hover .link-label { opacity: 1; transform: translateX(0); }

.rail-footer { padding: 1.5rem 1rem; border-top: var(--border-w) solid var(--border); }

/* Main Content Area */
.view-content { flex: 1; min-width: 0; padding: 3rem; transition: all 0.3s; }
.view-content.full-width { padding: 0 !important; }

/* Mobile Header */
.mobile-header {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 64px;
  padding: 0 1rem;
  align-items: center;
  justify-content: space-between;
  background: var(--accent);
  border-bottom: var(--border-w) solid var(--border);
  box-shadow: 0 4px 0 var(--border);
  z-index: 500;
}

.mobile-header-left { display: flex; align-items: center; gap: 0.75rem; }
.mobile-wordmark { font-size: 1.5rem; font-weight: 900; color: white; letter-spacing: -1px; }

.mobile-search-btn {
  background: var(--surface);
  border: var(--border-w) solid var(--border);
  color: var(--text);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 3px 3px 0 var(--border);
  transition: transform 0.1s;
}

.mobile-search-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--border);
}

/* Mobile Bottom Navigation */
.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 72px;
  background: var(--surface);
  border-top: var(--border-w) solid var(--border);
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
  justify-content: space-around;
  align-items: stretch;
}

.mobile-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--text-secondary);
  flex: 1;
  gap: 4px;
  transition: all 0.2s;
  border-right: var(--border-w) solid var(--border);
}

.mobile-tab:last-child { border-right: none; }

.mobile-tab span { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.5px; }

.mobile-tab.active {
  background: #27272a;
  color: white;
}

@media (max-width: 1024px) {
  .sidebar-comic { display: none; }
  .view-content { padding: 1.5rem; padding-top: calc(64px + 1.5rem); padding-bottom: calc(72px + 2rem); }
  .mobile-header, .mobile-bottom-nav { display: flex; }
}

@media (max-width: 480px) {
  .view-content { padding: 1rem; padding-top: calc(64px + 1.5rem); padding-bottom: calc(72px + 2rem); }
}
</style>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef, computed } from 'vue';
import HomeView from './views/HomeView.vue';
import AllSeriesView from './views/AllSeriesView.vue';
import TrendingView from './views/TrendingView.vue';
import LibraryView from './views/LibraryView.vue';
import SeriesView from './views/SeriesView.vue';
import ReaderView from './views/ReaderView.vue';
import SearchView from './views/SearchView.vue';
import { Home, Flame, LayoutGrid, Library, Search, Menu, X, Compass } from 'lucide-vue-next';

const currentView = shallowRef(HomeView);
const currentParams = ref({ parts: [], queryParams: {} });
const isMobileMenuOpen = ref(false);

const handleRoute = () => {
    const hash = window.location.hash || '#/';
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
    <!-- Desktop: Collapsible Icon Rail Sidebar -->
    <nav v-if="!isReader" class="sidebar-rail">
      <div class="rail-header">
        <!-- Logo Mark: Geometric V -->
        <svg class="logo-mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 35L8 12H14L20 24L26 12H32L20 35Z" fill="currentColor"/>
          <rect x="12" y="8" width="16" height="3" rx="1.5" fill="currentColor"/>
        </svg>
        <!-- Wordmark: Vrtwel (bold) + Comics (light) -->
        <div class="wordmark">
          <span class="wm-bold">Vrtwel</span><span class="wm-light">Comics</span>
        </div>
      </div>

      <div class="rail-nav">
        <a href="#/" class="rail-link" :class="{ active: currentView === HomeView }" title="Home">
          <Home :size="22" />
          <span class="link-label">Home</span>
        </a>
        <a href="#/trending" class="rail-link" :class="{ active: currentView === TrendingView }" title="Trending">
          <Flame :size="22" />
          <span class="link-label">Trending</span>
        </a>
        <a href="#/all" class="rail-link" :class="{ active: currentView === AllSeriesView }" title="Browse">
          <Compass :size="22" />
          <span class="link-label">Browse</span>
        </a>
        <a href="#/library" class="rail-link" :class="{ active: currentView === LibraryView }" title="Library">
          <Library :size="22" />
          <span class="link-label">Library</span>
        </a>
      </div>

      <div class="rail-footer">
        <a href="#/search" class="rail-link" :class="{ active: currentView === SearchView }" title="Search">
          <Search :size="22" />
          <span class="link-label">Search</span>
        </a>
      </div>
    </nav>

    <!-- Mobile: Top Header -->
    <header v-if="!isReader" class="mobile-header">
      <div class="mobile-header-left">
        <!-- Small Logo Mark -->
        <svg class="mobile-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 35L8 12H14L20 24L26 12H32L20 35Z" fill="currentColor"/>
          <rect x="12" y="8" width="16" height="3" rx="1.5" fill="currentColor"/>
        </svg>
        <span class="mobile-wordmark"><b>Vrtwel</b>Comics</span>
      </div>
      <button class="mobile-search-btn" @click="navigateTo('#/search')">
        <Search :size="22" />
      </button>
    </header>

    <!-- Mobile: Drawer Menu Overlay -->
    <div v-if="isMobileMenuOpen" class="mobile-drawer-overlay" @click="isMobileMenuOpen = false"></div>
    <nav v-if="isMobileMenuOpen" class="mobile-drawer">
      <div class="drawer-header">
        <span class="drawer-wordmark"><b>Vrtwel</b>Comics</span>
        <button class="drawer-close" @click="isMobileMenuOpen = false">
          <X :size="24" />
        </button>
      </div>
      <div class="drawer-nav">
        <a href="#/" class="drawer-link" :class="{ active: currentView === HomeView }" @click="isMobileMenuOpen = false">
          <Home :size="20" /> Home
        </a>
        <a href="#/trending" class="drawer-link" :class="{ active: currentView === TrendingView }" @click="isMobileMenuOpen = false">
          <Flame :size="20" /> Trending
        </a>
        <a href="#/all" class="drawer-link" :class="{ active: currentView === AllSeriesView }" @click="isMobileMenuOpen = false">
          <Compass :size="20" /> Browse
        </a>
        <a href="#/library" class="drawer-link" :class="{ active: currentView === LibraryView }" @click="isMobileMenuOpen = false">
          <Library :size="20" /> Library
        </a>
        <a href="#/search" class="drawer-link" :class="{ active: currentView === SearchView }" @click="isMobileMenuOpen = false">
          <Search :size="20" /> Search
        </a>
      </div>
    </nav>

    <!-- Main View -->
    <main class="view-content" :class="{ 'full-width': isReader }">
      <keep-alive>
        <component :is="currentView" :params="currentParams" />
      </keep-alive>
    </main>

    <!-- Mobile: Bottom Tab Navigation (5 tabs) -->
    <nav v-if="!isReader" class="mobile-bottom-nav">
      <a href="#/" class="mobile-tab" :class="{ active: currentView === HomeView }">
        <Home :size="20" />
        <span>Home</span>
      </a>
      <a href="#/trending" class="mobile-tab" :class="{ active: currentView === TrendingView }">
        <Flame :size="20" />
        <span>Trending</span>
      </a>
      <a href="#/all" class="mobile-tab" :class="{ active: currentView === AllSeriesView }">
        <Compass :size="20" />
        <span>Browse</span>
      </a>
      <a href="#/library" class="mobile-tab" :class="{ active: currentView === LibraryView }">
        <Library :size="20" />
        <span>Library</span>
      </a>
      <a href="#/search" class="mobile-tab" :class="{ active: currentView === SearchView }">
        <Search :size="20" />
        <span>Search</span>
      </a>
    </nav>
  </div>
</template>

<style>
/* Global Layout */
.app-container {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

/* Desktop: Collapsible Icon Rail Sidebar */
.sidebar-rail {
  width: var(--sidebar-w);
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.sidebar-rail:hover {
  width: var(--sidebar-w-expand);
}

.rail-header {
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border);
  height: 64px;
}

.logo-mark {
  width: 32px;
  height: 32px;
  color: var(--accent);
  flex-shrink: 0;
}

.wordmark {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.25s ease;
  white-space: nowrap;
}

.sidebar-rail:hover .wordmark {
  opacity: 1;
  transform: translateX(0);
}

.wm-bold {
  font-weight: 800;
  color: var(--text);
}

.wm-light {
  font-weight: 300;
  color: var(--text-secondary);
}

.rail-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rail-link {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;
}

.rail-link:hover {
  background: var(--card-bg);
  color: var(--text);
}

.rail-link.active {
  background: rgba(220, 38, 38, 0.15);
  color: var(--accent);
}

.link-label {
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.2s ease;
  white-space: nowrap;
  font-size: 0.9rem;
}

.sidebar-rail:hover .link-label {
  opacity: 1;
  transform: translateX(0);
}

.rail-footer {
  padding: 1rem 0.75rem;
  border-top: 1px solid var(--border);
}

/* Main Content Area */
.view-content {
  flex: 1;
  min-width: 0;
  padding: 2rem;
  transition: all 0.3s;
}

.view-content.full-width {
  padding: 0 !important;
}

/* Mobile: Header */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  padding: 0 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  align-items: center;
  justify-content: space-between;
  z-index: 500;
}

.mobile-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mobile-logo {
  width: 28px;
  height: 28px;
  color: var(--accent);
}

.mobile-wordmark {
  font-size: 1rem;
  color: var(--text);
}

.mobile-wordmark b {
  font-weight: 800;
}

.mobile-search-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.mobile-search-btn:hover {
  background: var(--card-bg);
  color: var(--text);
}

/* Mobile: Drawer Menu */
.mobile-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 800;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  z-index: 900;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-wordmark {
  font-size: 1.1rem;
}

.drawer-wordmark b {
  font-weight: 800;
}

.drawer-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.drawer-close:hover {
  background: var(--card-bg);
  color: var(--text);
}

.drawer-nav {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.drawer-link:hover {
  background: var(--card-bg);
  color: var(--text);
}

.drawer-link.active {
  background: rgba(220, 38, 38, 0.15);
  color: var(--accent);
}

/* Mobile: Bottom Tab Navigation */
.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.mobile-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--text-secondary);
  flex: 1;
  height: 100%;
  gap: 2px;
  transition: all 0.2s;
}

.mobile-tab span {
  font-size: 0.6rem;
  font-weight: 600;
}

.mobile-tab.active {
  color: var(--accent);
}

/* Responsive Breakpoints */
@media (max-width: 1024px) {
  .sidebar-rail {
    display: none;
  }

  .view-content {
    padding-top: 72px;
    padding-bottom: 80px;
  }

  .mobile-header {
    display: flex;
  }

  .mobile-bottom-nav {
    display: flex;
  }
}

@media (max-width: 480px) {
  .view-content {
    padding: 1rem;
    padding-top: 72px;
    padding-bottom: 80px;
  }
}
</style>

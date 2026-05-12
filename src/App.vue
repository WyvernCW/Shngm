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
const navContainer = ref(null);
let lastNavTime = 0;
const NAV_THROTTLE = 60; // ms

const mobileNavItems = [
  { label: 'HOME', icon: BookOpen, view: HomeView, href: '#/' },
  { label: 'HOT', icon: Flame, view: TrendingView, href: '#/trending' },
  { label: 'BROWSE', icon: Compass, view: AllSeriesView, href: '#/all' },
  { label: 'STASH', icon: Library, view: LibraryView, href: '#/library' },
  { label: 'FIND', icon: Search, view: SearchView, href: '#/search' }
];

const activeIdx = computed(() => {
  const idx = mobileNavItems.findIndex(i => i.view === currentView.value);
  return idx === -1 ? 0 : idx;
});

// Advanced Swipe/Drag Logic
const navDragX = ref(0);
const navDragY = ref(0);
let isDragging = false;
let startX = 0;
let startY = 0;
let dragStartIdx = 0;

const onNavPointerDown = (e) => {
  isDragging = true;
  startX = e.clientX || e.touches?.[0]?.clientX;
  startY = e.clientY || e.touches?.[0]?.clientY;
  navDragX.value = 0;
  navDragY.value = 0;
  dragStartIdx = activeIdx.value;
};

const onNavPointerMove = (e) => {
  if (!isDragging) return;
  const currentX = e.clientX || e.touches?.[0]?.clientX;
  const currentY = e.clientY || e.touches?.[0]?.clientY;
  let rawDiff = currentX - startX;
  navDragY.value = currentY - startY;
  
  // Precision Tab Calculation
  const barWidth = navContainer.value?.offsetWidth || 400;
  const trackWidth = barWidth - 10; // Accounting for 5px inset on each side
  const tabWidth = trackWidth / mobileNavItems.length;
  
  const currentPos = dragStartIdx * tabWidth;
  const leftBound = -currentPos;
  const rightBound = (mobileNavItems.length - 1 - dragStartIdx) * tabWidth;
  
  // Native Element Detection
  const navRect = navContainer.value?.getBoundingClientRect();
  if (navRect) {
    // Check exactly what is under the finger at the vertical center of the nav bar
    const el = document.elementFromPoint(currentX, navRect.top + navRect.height / 2);
    const tab = el?.closest('.mobile-tab');
    
    if (tab) {
      // Find the index of this tab in the DOM
      const tabs = Array.from(navContainer.value.querySelectorAll('.mobile-tab'));
      const foundIdx = tabs.indexOf(tab);
      
      if (foundIdx !== -1 && foundIdx !== activeIdx.value) {
        // Throttle navigation to prevent router spamming during fast swipes
        const now = Date.now();
        if (now - lastNavTime > NAV_THROTTLE) {
          navigateTo(mobileNavItems[foundIdx].href);
          lastNavTime = now;
        }
      }
    }
  }

  if (rawDiff < leftBound) {
    const overflow = leftBound - rawDiff;
    navDragX.value = leftBound - (overflow * 0.12);
  } else if (rawDiff > rightBound) {
    const overflow = rawDiff - rightBound;
    navDragX.value = rightBound + (overflow * 0.12);
  } else {
    navDragX.value = rawDiff;
  }
};

const onNavPointerUp = () => {
  if (!isDragging) return;
  isDragging = false;
  navDragX.value = 0;
};

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

    <!-- Mobile Navigation - Liquid Glass Pill -->
    <nav v-if="!isReader" ref="navContainer" class="mobile-bottom-nav"
         v-motion
         :initial="{ y: 100, opacity: 0 }"
         :enter="{ y: 0, opacity: 1, transition: { type: 'spring', damping: 20 } }"
         @pointerdown="onNavPointerDown"
         @pointermove="onNavPointerMove"
         @pointerup="onNavPointerUp"
         @pointerleave="onNavPointerUp"
         :style="{ 
           touchAction: 'none',
           backdropFilter: `blur(8px) saturate(200%) contrast(100%)`,
           backgroundColor: `rgba(0, 0, 0, 0.5)`,
           border: '1px solid rgba(255, 255, 255, 0.15)'
         }">
      
      <!-- Liquid Refraction Layer -->
      <div class="refraction-layer" style="filter: url(#cylindrical-stretch);"></div>

      <!-- Grainy/Noisy Glass Overlay -->
      <div class="glass-noise"></div>
      
      <!-- Liquid Background Highlight -->
      <div class="active-indicator-wrap">
        <div class="active-indicator" 
             :style="{ 
               transform: `translateX(calc(${(isDragging ? dragStartIdx : activeIdx) * 100}% + ${navDragX}px))`,
               width: `${100 / mobileNavItems.length}%`,
               transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
             }">
          <!-- Finger Glow Effect -->
          <div v-if="isDragging" class="finger-glow"
               :style="{
                 transform: `translate(calc(-50% + ${navDragX/10}px), calc(-50% + ${navDragY}px))`,
                 opacity: 0.8
               }"></div>
          
          <div class="liquid-inner">
            <div class="liquid-shine"></div>
          </div>
        </div>
      </div>

      <a v-for="(item, idx) in mobileNavItems" 
         :key="item.label"
         :href="item.href" 
         class="mobile-tab" 
         :class="{ active: currentView === item.view }">
        <component :is="item.icon" :size="20" :strokeWidth="currentView === item.view ? 3 : 2" />
        <span>{{ item.label }}</span>
      </a>
    </nav>

    <!-- Cylindrical Lens Stretch Filter -->
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="cylindrical-stretch">
          <feTurbulence type="fractalNoise" baseFrequency="0.0001 0.05" numOctaves="1" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="80" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
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

/* Mobile Bottom Navigation - Premium Liquid Glass Pill */
.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 24px; 
  left: 12px;
  right: 12px;
  margin: 0 auto;
  width: calc(100% - 24px);
  max-width: 400px;
  height: 66px;
  background: rgba(0, 0, 0, 0.5); /* Obsidian Acrylic Base */
  backdrop-filter: blur(8px) saturate(200%) contrast(100%);
  -webkit-backdrop-filter: blur(8px) saturate(200%) contrast(100%);
  border: 1px solid rgba(255, 255, 255, 0.2); /* Stronger Rim for Black Base */
  border-radius: 100px;
  z-index: 1000;
  justify-content: space-around;
  align-items: center;
  padding: 0 4px;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.3); /* Specular Rim */
  user-select: none;
  overflow: hidden;
}

.refraction-layer {
  position: absolute;
  inset: 0;
  backdrop-filter: url(#cylindrical-stretch);
  pointer-events: none;
  z-index: -1;
}

.glass-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.08;
  pointer-events: none;
  mix-blend-mode: overlay;
}

/* Edge Highlight (Liquid light refraction) */
.mobile-bottom-nav::before {
  content: '';
  position: absolute;
  top: 0; left: 15%; right: 15%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  pointer-events: none;
}

.active-indicator-wrap {
  position: absolute;
  inset: 5px;
  pointer-events: none;
  z-index: 0;
}

.active-indicator {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 100px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 
    0 10px 20px rgba(0, 0, 0, 0.4),
    inset 0 2px 5px rgba(255, 255, 255, 0.4),
    inset 0 -2px 10px rgba(0, 0, 0, 0.3),
    0 0 15px rgba(255, 255, 255, 0.1); /* External Glow */
  pointer-events: none;
  overflow: hidden;
}

/* Mesh Gradient Layer */
.active-indicator::after {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(at 0% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(at 100% 100%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
    radial-gradient(at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  filter: blur(5px);
  animation: mesh-shift 8s infinite alternate ease-in-out;
  z-index: 1;
}

.finger-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(8px);
  pointer-events: none;
  z-index: 10;
  mix-blend-mode: overlay;
  animation: glow-pulse 1.5s infinite alternate ease-in-out;
}

@keyframes glow-pulse {
  from { transform: translate(-50%, -50%) scale(0.8); opacity: 0.4; }
  to { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
}

@keyframes mesh-shift {
  0% { transform: scale(1) translate(0, 0); }
  100% { transform: scale(1.2) translate(5%, 5%); }
}

.liquid-inner {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
}

.liquid-shine {
  position: absolute;
  top: -100%;
  left: -100%;
  width: 300%;
  height: 300%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  animation: shine-move 4s infinite linear;
  opacity: 0.6;
}

@keyframes shine-move {
  0% { transform: translate(-8%, -8%) rotate(0deg); }
  50% { transform: translate(8%, 8%) rotate(15deg); }
  100% { transform: translate(-8%, -8%) rotate(0deg); }
}

.mobile-tab {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
  flex: 1;
  height: 100%;
  gap: 1px;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  border-radius: 100px;
}

.mobile-tab span { 
  font-size: 0.55rem; 
  font-weight: 800; 
  letter-spacing: 0.2px; 
  margin-top: 1px; 
  transition: inherit;
  text-transform: uppercase;
}

.mobile-tab.active {
  color: white;
  transform: scale(1.12);
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
}

.mobile-tab.active svg {
  animation: icon-pulse 2.5s infinite cubic-bezier(0.45, 0, 0.55, 1);
}

@keyframes icon-pulse {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.15); filter: brightness(1.3) drop-shadow(0 0 5px rgba(255,255,255,0.4)); }
}

.mobile-tab.active span {
  font-weight: 900;
  letter-spacing: 0.5px;
}

@media (max-width: 1024px) {
  .sidebar-comic { display: none; }
  .view-content { padding: 1.5rem; padding-top: calc(64px + 1.5rem); padding-bottom: calc(88px + 2rem); }
  .mobile-header, .mobile-bottom-nav { display: flex; }
}

@media (max-width: 480px) {
  .view-content { padding: 1rem; padding-top: calc(64px + 1.5rem); padding-bottom: calc(72px + 2rem); }
}
</style>

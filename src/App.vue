<script setup>
import { ref, onMounted, onUnmounted, shallowRef, computed } from 'vue';
import HomeView from './views/HomeView.vue';
import AllSeriesView from './views/AllSeriesView.vue';
import TrendingView from './views/TrendingView.vue';
import LibraryView from './views/LibraryView.vue';
import SeriesView from './views/SeriesView.vue';
import ReaderView from './views/ReaderView.vue';
import SearchView from './views/SearchView.vue';
import { BookOpen, Flame, Compass, Library, Search, Bell } from 'lucide-vue-next';

// Update Checker State
const LOCAL_VERSION = '0.9.0';
const isUpdateAvailable = ref(false);
const showUpdateModal = ref(false);
const updateInfo = ref(null);

// Formatted changelog HTML parser
const formattedChangelog = computed(() => {
    if (!updateInfo.value?.changelog) return '';
    let html = updateInfo.value.changelog;
    // Replace HTML entities
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet points: - item or * item
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    // Wrap lists
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1<\/ul>');
    // Headings: ### text
    html = html.replace(/^\s*###\s+(.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^\s*##\s+(.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^\s*#\s+(.*)$/gm, '<h1>$1</h1>');
    // Paragraphs / line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
});

const checkForUpdates = async () => {
    try {
        const res = await fetch('https://api.github.com/repos/WyvernCW/Shngm/releases/latest');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.tag_name) {
            const latestTag = data.tag_name; // e.g. "V1.0.0"
            const cleanLatest = latestTag.replace(/^[vV]/, '');
            const cleanLocal = LOCAL_VERSION.replace(/^[vV]/, '');
            
            if (cleanLatest !== cleanLocal) {
                updateInfo.value = {
                    version: latestTag,
                    title: data.name || latestTag,
                    changelog: data.body || '',
                    url: data.html_url || 'https://github.com/WyvernCW/Shngm/releases/tag/V1.0.0',
                    assets: data.assets ? data.assets.map(a => ({ name: a.name, url: a.browser_download_url })) : []
                };
                isUpdateAvailable.value = true;
                
                // Show update modal automatically if not dismissed yet
                const dismissed = localStorage.getItem('shngm_update_dismissed');
                if (dismissed !== latestTag) {
                    showUpdateModal.value = true;
                }
            }
        }
    } catch (e) {
        console.error('Failed to check for updates:', e);
    }
};

const handleLater = () => {
    showUpdateModal.value = false;
    if (updateInfo.value?.version) {
        localStorage.setItem('shngm_update_dismissed', updateInfo.value.version);
    }
};

const handleUpdateNow = () => {
    if (!updateInfo.value) return;
    
    // Detect platform
    let platform = 'web';
    if (window.Capacitor && window.Capacitor.isNative) {
        platform = window.Capacitor.getPlatform(); // 'android' or 'ios'
    } else {
        // Web detection fallback based on user agent
        const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
        if (/android/i.test(ua)) {
            platform = 'android';
        } else if (/ipad|iphone|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
            platform = 'ios';
        }
    }
    
    const assets = updateInfo.value.assets || [];
    
    if (platform === 'android') {
        const apkAsset = assets.find(a => a.name.toLowerCase().endsWith('.apk'));
        if (apkAsset) {
            window.open(apkAsset.url, '_blank');
            showUpdateModal.value = false;
            return;
        }
    } else if (platform === 'ios') {
        const ipaAsset = assets.find(a => a.name.toLowerCase().endsWith('.ipa'));
        const debAsset = assets.find(a => a.name.toLowerCase().endsWith('.deb'));
        
        if (ipaAsset || debAsset) {
            if (ipaAsset) window.open(ipaAsset.url, '_blank');
            if (debAsset) {
                // Short delay to avoid concurrent window.open blocks
                setTimeout(() => {
                    window.open(debAsset.url, '_blank');
                }, 400);
            }
            showUpdateModal.value = false;
            return;
        }
    }
    
    // Default fallback: open github releases page
    if (updateInfo.value.url) {
        window.open(updateInfo.value.url, '_blank');
    }
    showUpdateModal.value = false;
};

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
    
    localStorage.setItem('vrtwel_last_route', hash);

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

const isOnline = ref(navigator.onLine);

const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine;
};

onMounted(() => {
    if (window.location.hash === '' || window.location.hash === '#/' || window.location.hash === '#') {
        const lastRoute = localStorage.getItem('vrtwel_last_route');
        if (lastRoute && lastRoute !== '#/') {
            window.location.hash = lastRoute;
        }
    }

    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    handleRoute();
    checkForUpdates();

    if (window.Capacitor) {
        import('@capacitor/app').then(({ App: CapacitorApp }) => {
            CapacitorApp.addListener('backButton', ({ canGoBack }) => {
                const h = window.location.hash;
                if (h === '' || h === '#/' || h === '#/all' || h === '#/trending' || h === '#/library' || h === '#/search') {
                    CapacitorApp.exitApp();
                } else {
                    window.history.back();
                }
            });
        });
    }
});

onUnmounted(() => {
    window.removeEventListener('hashchange', handleRoute);
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
});

const isReader = computed(() => currentView.value === ReaderView);

const navigateTo = (path) => {
    window.location.hash = path;
};
</script>

<template>
  <div class="app-container" :class="{ 'is-reader': isReader, 'is-offline': !isOnline }">
    <!-- Offline Banner Alert -->
    <div v-if="!isOnline" class="offline-banner"
         v-motion
         :initial="{ y: -100, opacity: 0 }"
         :enter="{ y: 0, opacity: 1, transition: { type: 'spring', damping: 20 } }">
      <span class="offline-dot"></span>
      <span class="offline-text">OFFLINE ARCHIVE MODE — DOCK STORAGE ACTIVE</span>
    </div>

    <!-- Desktop Sidebar -->
    <nav v-if="!isReader" class="sidebar-comic">
      <div class="rail-header">
        <img src="/assets/logo.png" class="logo-box" alt="VRTWEL Logo" />
        <div class="wordmark">
          <span>VRTWEL</span>
          <span class="wm-sub">COMICS</span>
        </div>
        <button v-if="isUpdateAvailable" class="header-bell-btn desktop-bell" @click.stop="showUpdateModal = true">
          <Bell :size="20" strokeWidth="2.5" />
          <span v-if="!showUpdateModal" class="bell-badge"></span>
        </button>
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
      <div class="mobile-header-actions" style="display: flex; align-items: center; gap: 8px;">
        <button v-if="isUpdateAvailable" class="header-bell-btn" @click.stop="showUpdateModal = true" style="margin-left: 0;">
          <Bell :size="18" strokeWidth="2.5" />
          <span v-if="!showUpdateModal" class="bell-badge"></span>
        </button>
        <button class="mobile-search-btn" @click="navigateTo('#/search')">
          <Search :size="24" strokeWidth="2.5" />
        </button>
      </div>
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

    <!-- Update Announcement Modal (Brutalist Acrylic) -->
    <Transition name="fade-modal">
      <div v-if="showUpdateModal && updateInfo" class="update-overlay" @click="handleLater">
        <div class="update-modal comic-panel" @click.stop>
          <div class="update-header">
            <h2 class="update-title">UPDATE AVAILABLE!</h2>
            <span class="update-tag">{{ updateInfo.version }}</span>
          </div>
          
          <div class="update-body">
            <div class="changelog-header">CHANGELOG FOR {{ updateInfo.title.toUpperCase() }}</div>
            <div class="changelog-content" v-html="formattedChangelog"></div>
          </div>
          
          <div class="update-actions">
            <button class="comic-button secondary" @click="handleLater">LATER</button>
            <button class="comic-button update-now-btn" @click="handleUpdateNow">UPDATE NOW</button>
          </div>
        </div>
      </div>
    </Transition>

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

.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: var(--red);
  color: white;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-bottom: var(--border-w) solid var(--border);
  font-weight: 900;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.offline-dot {
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 0 8px white;
  animation: offline-blink 1.5s infinite ease-in-out;
}

.offline-text {
  text-shadow: 1px 1px 0 #000;
}

@keyframes offline-blink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.app-container.is-offline {
  padding-top: 40px;
}

.app-container.is-offline .mobile-header {
  top: 40px;
}

.app-container.is-offline .sidebar-comic {
  top: 40px;
  height: calc(100vh - 40px);
}

/* Header Bell Icon */
.header-bell-btn {
  background: var(--surface);
  border: 2px solid var(--border);
  color: var(--text);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 2px 2px 0 var(--border);
  transition: transform 0.1s, background-color 0.2s;
  padding: 0;
  margin-left: 8px;
}

.header-bell-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--border);
}

.header-bell-btn:hover {
  background: var(--yellow);
  color: black;
}

.bell-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  background: var(--accent);
  border: 1.5px solid var(--border);
  border-radius: 50%;
  box-shadow: 0 0 4px var(--accent);
}

.desktop-bell {
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: auto;
}

.sidebar-comic:hover .desktop-bell {
  opacity: 1;
}

/* Update Modal Overlay */
.update-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.4);
  backdrop-filter: blur(40px) saturate(200%) contrast(90%);
  -webkit-backdrop-filter: blur(40px) saturate(200%) contrast(90%);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.update-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.05;
  pointer-events: none;
  mix-blend-mode: overlay;
}

.update-modal {
  width: 100%;
  max-width: 500px;
  background: var(--surface);
  color: var(--text);
  padding: 2rem;
  border-width: 4px;
  box-shadow: 12px 12px 0px var(--border);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.update-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px dashed var(--border);
  padding-bottom: 0.75rem;
}

.update-title {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: -1px;
  color: var(--yellow);
  text-shadow: 2px 2px 0 var(--border);
  margin: 0;
}

.update-tag {
  background: var(--accent);
  color: white;
  font-weight: 900;
  padding: 2px 8px;
  border: 2px solid var(--border);
  font-size: 0.8rem;
  box-shadow: 2px 2px 0 var(--border);
}

.update-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.changelog-header {
  font-weight: 900;
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--text-secondary);
}

.changelog-content {
  background: var(--bg);
  border: 2px solid var(--border);
  padding: 1rem;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text);
}

.changelog-content h1, .changelog-content h2, .changelog-content h3 {
  font-weight: 900;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
  color: var(--yellow);
}
.changelog-content h1 { font-size: 1.2rem; }
.changelog-content h2 { font-size: 1.1rem; }
.changelog-content h3 { font-size: 1rem; }

.changelog-content ul {
  padding-left: 1.25rem;
  margin-bottom: 0.5rem;
}

.changelog-content li {
  margin-bottom: 0.25rem;
}

.update-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 0.25rem;
}

.update-now-btn {
  background: var(--green) !important;
}
.update-now-btn:hover {
  background: #047857 !important;
}

/* Modal Animations */
.fade-modal-enter-active, .fade-modal-leave-active {
  transition: opacity 0.3s ease;
}
.fade-modal-enter-from, .fade-modal-leave-to {
  opacity: 0;
}

.fade-modal-enter-active .update-modal {
  animation: modal-zoom-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-modal-leave-active .update-modal {
  animation: modal-zoom-out 0.2s ease-in;
}

@keyframes modal-zoom-in {
  from { transform: scale(0.8) translateY(30px); }
  to { transform: scale(1) translateY(0); }
}
@keyframes modal-zoom-out {
  from { transform: scale(1) translateY(0); }
  to { transform: scale(0.9) translateY(20px); }
}
</style>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Download } from 'lucide-vue-next';

const isInstallable = ref(!!window.deferredInstallPrompt);
const isDismissed = ref(localStorage.getItem('vrtwel_pwa_banner_dismissed') === 'true');

const onInstallable = () => {
    isInstallable.value = true;
};

const onInstalled = () => {
    isInstallable.value = false;
};

onMounted(() => {
    window.addEventListener('pwa-installable', onInstallable);
    window.addEventListener('pwa-installed', onInstalled);
});

onUnmounted(() => {
    window.removeEventListener('pwa-installable', onInstallable);
    window.removeEventListener('pwa-installed', onInstalled);
});

const triggerInstall = async () => {
    const promptEvent = window.deferredInstallPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log('[PWA] User choice:', outcome);
    if (outcome === 'accepted') {
        window.deferredInstallPrompt = null;
        isInstallable.value = false;
    }
};

const dismiss = () => {
    isDismissed.value = true;
    localStorage.setItem('vrtwel_pwa_banner_dismissed', 'true');
};
</script>

<template>
  <div v-if="isInstallable && !isDismissed" class="pwa-banner comic-panel">
    <div class="banner-body">
      <div class="banner-icon-wrap">
        <Download :size="28" strokeWidth="3" />
      </div>
      <div class="banner-content">
        <h3 class="banner-title">INSTALL VRTWEL APP</h3>
        <p class="banner-text">Read manga and manhwa completely offline and get native app speed directly from your home screen!</p>
      </div>
    </div>
    <div class="banner-actions">
      <button @click="triggerInstall" class="comic-button">INSTALL</button>
      <button @click="dismiss" class="comic-button secondary">LATER</button>
    </div>
  </div>
</template>

<style scoped>
.pwa-banner {
  background: var(--surface);
  border: var(--border-w) solid var(--border);
  box-shadow: var(--shadow-offset) var(--shadow-offset) 0 var(--border);
  padding: 1.5rem;
  margin-bottom: 2.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  position: relative;
  overflow: hidden;
}

.pwa-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--border) 1.5px, transparent 1.5px);
  background-size: 12px 12px;
  opacity: 0.1;
  z-index: 0;
  pointer-events: none;
}

.banner-body {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  z-index: 1;
  flex: 1;
}

.banner-icon-wrap {
  width: 56px;
  height: 56px;
  background: var(--yellow);
  border: var(--border-w) solid var(--border);
  box-shadow: 3px 3px 0 var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #000;
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.banner-title {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: -0.5px;
  text-transform: uppercase;
}

.banner-text {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.banner-actions {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
  z-index: 1;
}

@media (max-width: 768px) {
  .pwa-banner {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    padding: 1.2rem;
  }
  .banner-actions {
    justify-content: flex-end;
  }
}
</style>

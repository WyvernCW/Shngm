<script setup>
import { X, Layout, Maximize2 } from 'lucide-vue-next';

const props = defineProps({
    isOpen: Boolean,
    currentSettings: Object
});

const emit = defineEmits(['close', 'update']);

const modes = [
    { id: 'long-strip', label: 'STRIP', icon: Layout },
    { id: 'single-page', label: 'PAGE', icon: Maximize2 }
];

const bgs = [
    { id: '#09090b', label: 'INK', class: 'bg-dark' },
    { id: '#18181b', label: 'PAPER', class: 'bg-light' },
    { id: '#27272a', label: 'SEPIA', class: 'bg-sepia' }
];

const fits = [
    { id: 'width', label: 'FIT WIDTH' },
    { id: 'height', label: 'FIT HEIGHT' },
    { id: 'original', label: 'ORIGINAL' }
];

const update = (key, val) => {
    emit('update', { ...props.currentSettings, [key]: val });
};
</script>

<template>
  <transition name="slide-panel">
    <div v-if="isOpen" class="reader-settings comic-panel">
      <div class="settings-header">
        <h3>SETTINGS</h3>
        <button class="comic-button secondary icon-btn" @click="emit('close')"><X :size="24" strokeWidth="3" /></button>
      </div>

      <div class="settings-body">
        <div class="setting-group">
          <label>MODE</label>
          <div class="mode-grid">
            <button v-for="mode in modes" 
                    :key="mode.id" 
                    class="comic-panel mode-btn"
                    :class="{ 'active': currentSettings.readingMode === mode.id }"
                    @click="update('readingMode', mode.id)">
              <component :is="mode.icon" :size="24" strokeWidth="2.5" />
              <span>{{ mode.label }}</span>
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label>IMAGE FIT</label>
          <div class="fit-row">
            <button v-for="fit in fits" 
                    :key="fit.id"
                    class="comic-panel fit-btn"
                    :class="{ 'active': currentSettings.fit === fit.id }"
                    @click="update('fit', fit.id)">
              {{ fit.label }}
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label>PAPER COLOR</label>
          <div class="bg-grid">
            <button v-for="bg in bgs" 
                    :key="bg.id"
                    class="bg-btn"
                    :class="[bg.class, { 'active': currentSettings.bg === bg.id }]"
                    @click="update('bg', bg.id)"
                    :title="bg.label">
            </button>
          </div>
        </div>

        <div class="setting-group">
          <div class="label-row">
             <label>GUTTER ({{ currentSettings.gap }}PX)</label>
          </div>
          <input type="range" 
                 min="0" max="100" step="10" 
                 :value="currentSettings.gap" 
                 @input="e => update('gap', parseInt(e.target.value))"
                 class="slider comic-panel">
        </div>

        <div class="setting-group" style="margin-top: 2rem;">
          <button class="comic-panel mode-btn" style="width: 100%; flex-direction: row; justify-content: space-between;"
                  :class="{ 'active': currentSettings.autoAdvance }"
                  @click="update('autoAdvance', !currentSettings.autoAdvance)">
              <span>AUTO-ADVANCE</span>
              <div class="checkbox" :class="{ 'checked': currentSettings.autoAdvance }"></div>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.reader-settings {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  background: var(--surface);
  z-index: 2000;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  border-right: none;
  border-top: none;
  border-bottom: none;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  border-bottom: var(--border-w) solid var(--border);
  padding-bottom: 1rem;
}

.settings-header h3 { font-size: 2rem; font-weight: 900; margin: 0; color: var(--text); }
.icon-btn { padding: 8px; box-shadow: 2px 2px 0 var(--border); border-radius: 0; }

.setting-group { margin-bottom: 2.5rem; }
.setting-group label { display: block; font-size: 1.2rem; font-weight: 900; color: var(--text); margin-bottom: 1rem; }

.mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.mode-btn { 
  padding: 1rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; box-shadow: 4px 4px 0 var(--border);
}
.mode-btn.active { background: var(--accent); color: white; transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--border); }
.mode-btn span { font-weight: 900; }

.fit-row { display: flex; gap: 0.8rem; flex-wrap: wrap; }
.fit-btn { padding: 0.8rem 1rem; cursor: pointer; font-size: 0.9rem; font-weight: 900; box-shadow: 3px 3px 0 var(--border); }
.fit-btn.active { background: var(--yellow); transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--border); }

.bg-grid { display: flex; gap: 1rem; }
.bg-btn { width: 50px; height: 50px; border: var(--border-w) solid var(--border); cursor: pointer; transition: all 0.1s; box-shadow: 3px 3px 0 var(--border); }
.bg-btn:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0 var(--border); }
.bg-btn.active { border-color: var(--accent); transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--accent); }
.bg-dark { background: #09090b; }
.bg-light { background: #fdfdf9; }
.bg-sepia { background: #f4ecd8; }

.slider { width: 100%; height: 24px; background: var(--bg); cursor: pointer; -webkit-appearance: none; padding: 0; }
.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; background: var(--accent); border-left: var(--border-w) solid var(--border); border-right: var(--border-w) solid var(--border); cursor: pointer; }

.checkbox { width: 24px; height: 24px; border: var(--border-w) solid var(--border); background: var(--surface); transition: background 0.1s; }
.checkbox.checked { background: var(--text); }

.slide-panel-enter-active, .slide-panel-leave-active { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.slide-panel-enter-from, .slide-panel-leave-to { transform: translateX(100%); }

@media (max-width: 480px) {
  .reader-settings { width: 100%; border-left: none; }
}
</style>

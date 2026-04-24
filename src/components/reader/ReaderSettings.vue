<script setup>
import { X, Layout, Maximize2, Monitor, Minimize, Sun, Moon, Type } from 'lucide-vue-next';

const props = defineProps({
    isOpen: Boolean,
    currentSettings: Object
});

const emit = defineEmits(['close', 'update']);

const modes = [
    { id: 'long-strip', label: 'Long Strip', icon: Layout },
    { id: 'single-page', label: 'Single Page', icon: Maximize2 }
];

const bgs = [
    { id: '#020617', label: 'Space', class: 'bg-space' },
    { id: '#111111', label: 'Dark', class: 'bg-dark' },
    { id: '#ffffff', label: 'Light', class: 'bg-light' },
    { id: '#f4ecd8', label: 'Sepia', class: 'bg-sepia' }
];

const fits = [
    { id: 'width', label: 'Fit Width' },
    { id: 'height', label: 'Fit Height' },
    { id: 'original', label: 'Original' }
];

const update = (key, val) => {
    emit('update', { ...props.currentSettings, [key]: val });
};
</script>

<template>
  <transition name="slide-panel">
    <div v-if="isOpen" class="reader-settings glass">
      <div class="settings-header">
        <h3>Reader Settings</h3>
        <button class="close-btn" @click="emit('close')"><X :size="20" /></button>
      </div>

      <div class="settings-body">
        <!-- Reading Mode -->
        <div class="setting-group">
          <label>Reading Mode</label>
          <div class="mode-grid">
            <button v-for="mode in modes" 
                    :key="mode.id" 
                    class="mode-btn"
                    :class="{ 'active': currentSettings.readingMode === mode.id }"
                    @click="update('readingMode', mode.id)">
              <component :is="mode.icon" :size="18" />
              <span>{{ mode.label }}</span>
            </button>
          </div>
        </div>

        <!-- Scale / Fit -->
        <div class="setting-group">
          <label>Image Fit</label>
          <div class="fit-row">
            <button v-for="fit in fits" 
                    :key="fit.id"
                    class="fit-btn"
                    :class="{ 'active': currentSettings.fit === fit.id }"
                    @click="update('fit', fit.id)">
              {{ fit.label }}
            </button>
          </div>
        </div>

        <!-- Background -->
        <div class="setting-group">
          <label>Background</label>
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

        <!-- Page Gap -->
        <div class="setting-group">
          <div class="label-row">
             <label>Page Gap</label>
             <span class="value">{{ currentSettings.gap }}px</span>
          </div>
          <input type="range" 
                 min="0" max="100" step="10" 
                 :value="currentSettings.gap" 
                 @input="e => update('gap', parseInt(e.target.value))"
                 class="slider">
        </div>

        <!-- Others -->
        <div class="setting-group">
          <div class="toggle-row">
            <label>Auto-advance Chapter</label>
            <div class="toggle" 
                 :class="{ 'active': currentSettings.autoAdvance }"
                 @click="update('autoAdvance', !currentSettings.autoAdvance)">
              <div class="knob"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <p>Settings are saved automatically</p>
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
  width: 340px;
  background: rgba(10, 18, 40, 0.95);
  backdrop-filter: blur(20px);
  z-index: 2000;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 50px rgba(0,0,0,0.5);
  border-left: 1px solid var(--border);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}

.settings-header h3 { font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--accent); }
.close-btn { background: none; border: none; color: white; cursor: pointer; padding: 0.5rem; }

.setting-group { margin-bottom: 2rem; }
.setting-group label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--muted); margin-bottom: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }

.mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.mode-btn { 
  background: var(--card-bg); border: 1px solid var(--border); color: white; padding: 0.8rem; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: all 0.2s;
}
.mode-btn.active { border-color: var(--accent); background: rgba(139, 92, 246, 0.15); color: var(--accent); }

.fit-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.fit-btn { background: var(--card-bg); border: 1px solid var(--border); color: white; padding: 0.5rem 1rem; border-radius: 99px; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
.fit-btn.active { background: var(--accent); border-color: var(--accent); }

.bg-grid { display: flex; gap: 1rem; }
.bg-btn { width: 40px; height: 40px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transform: scale(0.9); transition: all 0.2s; }
.bg-btn.active { border-color: var(--accent); transform: scale(1.1); }
.bg-space { background: #020617; }
.bg-dark { background: #111; }
.bg-light { background: #fff; }
.bg-sepia { background: #f4ecd8; }

.slider { width: 100%; height: 6px; background: var(--card-bg); border-radius: 3px; cursor: pointer; -webkit-appearance: none; }
.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; background: var(--accent); border-radius: 50%; cursor: pointer; }

.toggle-row { display: flex; justify-content: space-between; align-items: center; }
.toggle { width: 48px; height: 26px; background: var(--card-bg); border-radius: 13px; position: relative; cursor: pointer; transition: all 0.3s; }
.toggle.active { background: var(--accent); }
.knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: all 0.3s; }
.toggle.active .knob { left: 25px; }

.settings-footer { margin-top: auto; text-align: center; font-size: 0.75rem; color: var(--muted); }

.slide-panel-enter-active, .slide-panel-leave-active { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-panel-enter-from, .slide-panel-leave-to { transform: translateX(100%); }

@media (max-width: 400px) {
  .reader-settings { width: 100%; }
}
</style>

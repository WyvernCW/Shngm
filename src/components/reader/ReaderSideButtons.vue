<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps({
    isVisible: Boolean,
    hasPrev: Boolean,
    hasNext: Boolean
});

const emit = defineEmits(['navigate']);
</script>

<template>
  <div class="reader-side-buttons reader-ui" :class="{ 'hidden': !isVisible, 'visible': isVisible }">
    <button v-if="hasPrev"
            class="side-btn prev glass" 
            @click.stop="emit('navigate', 'prev')">
      <ChevronLeft :size="32" />
    </button>
    
    <button v-if="hasNext"
            class="side-btn next glass" 
            @click.stop="emit('navigate', 'next')">
      <ChevronRight :size="32" />
    </button>
  </div>
</template>

<style scoped>
.reader-side-buttons {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 900;
}

.side-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 60px;
    height: 120px;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid var(--border);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: all;
    transition: all 0.2s;
    border-radius: 99px; /* Pill shape */
}

.side-btn:hover {
    background: rgba(139, 92, 246, 0.4);
    box-shadow: 0 0 20px var(--accent-glow);
}

.prev { left: 1rem; border-top-left-radius: 10px; border-bottom-left-radius: 10px; }
.next { right: 1rem; border-top-right-radius: 10px; border-bottom-right-radius: 10px; }

@media (max-width: 800px) {
    .side-btn { width: 44px; height: 80px; }
}
</style>

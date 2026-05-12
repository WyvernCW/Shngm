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
            class="side-btn prev comic-panel" 
            @click.stop="emit('navigate', 'prev')">
      <ChevronLeft :size="40" strokeWidth="3" />
    </button>
    
    <button v-if="hasNext"
            class="side-btn next comic-panel" 
            @click.stop="emit('navigate', 'next')">
      <ChevronRight :size="40" strokeWidth="3" />
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
    background: var(--surface);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: all;
    transition: all 0.1s;
    box-shadow: 4px 4px 0 var(--border);
}

.side-btn:hover {
    background: var(--yellow);
    transform: translateY(-50%) translate(-2px, -2px);
    box-shadow: 6px 6px 0 var(--border);
}

.side-btn:active {
    transform: translateY(-50%) translate(2px, 2px);
    box-shadow: 2px 2px 0 var(--border);
}

.prev { left: 0; border-left: none; }
.next { right: 0; border-right: none; box-shadow: -4px 4px 0 var(--border); }
.next:hover { transform: translateY(-50%) translate(2px, -2px); box-shadow: -6px 6px 0 var(--border); }
.next:active { transform: translateY(-50%) translate(-2px, 2px); box-shadow: -2px 2px 0 var(--border); }

@media (max-width: 800px) {
    .side-btn { width: 40px; height: 80px; }
}
</style>

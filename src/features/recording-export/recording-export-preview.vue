<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';

import CaptionCanvas from '@/features/captions/caption-canvas.vue';
import type {
  TCaptionLayout,
  TCaptionPosition,
} from '@/features/captions/captions.model';
import type { TTypingSessionState } from '@/features/typing/typing-session.model';

type TProps = { session: TTypingSessionState; layout: TCaptionLayout };
const props = defineProps<TProps>();
const position = defineModel<TCaptionPosition>('position', { required: true });
const frame = useTemplateRef('frame');
const scale = ref(0);
const dragging = ref(false);
let observer: ResizeObserver | undefined;
let dragStart: {
  pointerId: number;
  x: number;
  y: number;
  position: TCaptionPosition;
} | null = null;

function movePosition(x: number, y: number) {
  position.value = {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

function startDrag(event: PointerEvent) {
  if (event.button !== 0 || !frame.value) return;
  frame.value.focus();
  frame.value.setPointerCapture(event.pointerId);
  dragStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    position: { ...position.value },
  };
  dragging.value = true;
  event.preventDefault();
}

function drag(event: PointerEvent) {
  if (!dragStart || event.pointerId !== dragStart.pointerId || !frame.value)
    return;
  const rect = frame.value.getBoundingClientRect();
  movePosition(
    dragStart.position.x + (event.clientX - dragStart.x) / rect.width,
    dragStart.position.y + (event.clientY - dragStart.y) / rect.height,
  );
}

function stopDrag() {
  dragStart = null;
  dragging.value = false;
}

function keyMove(event: KeyboardEvent) {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey)
    return;
  const step = event.shiftKey ? 0.05 : 0.01;
  switch (event.key) {
    case 'ArrowLeft':
      movePosition(position.value.x - step, position.value.y);
      break;
    case 'ArrowRight':
      movePosition(position.value.x + step, position.value.y);
      break;
    case 'ArrowUp':
      movePosition(position.value.x, position.value.y - step);
      break;
    case 'ArrowDown':
      movePosition(position.value.x, position.value.y + step);
      break;
    default:
      return;
  }
  event.preventDefault();
}

onMounted(() => {
  if (!frame.value) return;
  observer = new ResizeObserver(([entry]) => {
    scale.value = entry.contentRect.width / 1920;
  });
  observer.observe(frame.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div
    ref="frame"
    class="recording-export-preview"
    :class="{ 'recording-export-preview--dragging': dragging }"
    tabindex="0"
    role="group"
    aria-label="Caption placement. Drag or use arrow keys to move captions."
    @pointerdown="startDrag"
    @pointermove="drag"
    @pointerup="stopDrag"
    @pointercancel="stopDrag"
    @lostpointercapture="stopDrag"
    @keydown="keyMove"
  >
    <div class="composition" :style="{ transform: `scale(${scale})` }">
      <!-- Static mode disables Motion projection before display-only scaling. -->
      <CaptionCanvas
        :committed-captions="props.session.captions"
        :active-text="props.session.text"
        :layout="{ ...props.layout, position }"
        :show-caret="false"
        static
      />
    </div>
    <span
      class="anchor"
      :style="{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }"
      aria-hidden="true"
    ></span>
  </div>
</template>

<style scoped>
.recording-export-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #00ff00;
  border-radius: var(--radius-sm);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.recording-export-preview--dragging {
  cursor: grabbing;
}

.recording-export-preview:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}

.composition {
  position: absolute;
  top: 0;
  left: 0;
  width: 1920px;
  height: 1080px;
  transform-origin: top left;
}

.anchor {
  position: absolute;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 50%;
  background: rgb(0 0 0 / 25%);
  pointer-events: none;
}
</style>

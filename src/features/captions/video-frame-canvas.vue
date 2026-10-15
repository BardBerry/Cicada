<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
} from 'vue';

import type { TTypingSessionState } from '@/features/typing/typing-session.model';

import CaptionCanvas from './caption-canvas.vue';
import type { TCaptionLayout, TCaptionPosition } from './captions.model';

type TProps = {
  session: TTypingSessionState;
  sessionRevision: number;
  layout: TCaptionLayout;
  showCaret: boolean;
};

const props = defineProps<TProps>();
const emit = defineEmits<{
  'update:position': [position: TCaptionPosition];
  finishPositioning: [];
}>();
const area = useTemplateRef('area');
const frame = useTemplateRef('frame');
const handle = useTemplateRef('handle');
const captionDocumentBody = shallowRef<HTMLElement | null>(null);
const fontsReady = ref(false);
const scale = ref(0);
const frameStyle = computed(() => ({
  width: `${1920 * scale.value}px`,
  height: `${1080 * scale.value}px`,
}));
const dragging = ref(false);

let observer: ResizeObserver | undefined;
let disposed = false;
let dragStart: {
  pointerId: number;
  x: number;
  y: number;
  position: TCaptionPosition;
} | null = null;

async function initializeCaptionDocument(event: Event) {
  const document = (event.target as HTMLIFrameElement).contentDocument;
  if (!document) return;
  // Reuse the application's compiled styles, including the single caption theme.
  const stylesReady: Promise<void>[] = [];
  for (const style of window.document.querySelectorAll(
    'style, link[rel="stylesheet"]',
  )) {
    const copy = style.cloneNode(true);
    if (copy instanceof HTMLLinkElement) {
      stylesReady.push(
        new Promise((resolve) => {
          copy.addEventListener('load', () => resolve(), { once: true });
          copy.addEventListener('error', () => resolve(), { once: true });
        }),
      );
    }
    document.head.append(copy);
  }
  document.body.style.background = 'transparent';
  await Promise.all(stylesReady);
  if (disposed) return;
  captionDocumentBody.value = document.body;
  await nextTick();
  await document.fonts.ready;
  if (disposed) return;
  fontsReady.value = true;
}

function useStudioAnimationClock() {
  // onUpdate selects Motion's JS clock. WAAPI uses the iframe's different timeline.
  return undefined;
}

function movePosition(x: number, y: number) {
  emit('update:position', {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  });
}

function startDrag(event: PointerEvent) {
  if (event.button !== 0 || !handle.value) return;
  handle.value.focus();
  handle.value.setPointerCapture(event.pointerId);
  dragStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    position: { ...props.layout.position },
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

function stopDrag(event: PointerEvent) {
  if (!dragStart || event.pointerId !== dragStart.pointerId) return;
  dragStart = null;
  dragging.value = false;
  emit('finishPositioning');
}

function keyMove(event: KeyboardEvent) {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey)
    return;
  const step = event.shiftKey ? 0.05 : 0.01;
  const position = props.layout.position;
  switch (event.key) {
    case 'Escape':
    case 'Enter':
      emit('finishPositioning');
      event.preventDefault();
      return;
    case 'ArrowLeft':
      movePosition(position.x - step, position.y);
      break;
    case 'ArrowRight':
      movePosition(position.x + step, position.y);
      break;
    case 'ArrowUp':
      movePosition(position.x, position.y - step);
      break;
    case 'ArrowDown':
      movePosition(position.x, position.y + step);
      break;
    default:
      return;
  }
  event.preventDefault();
}

onMounted(() => {
  if (!area.value) return;
  observer = new ResizeObserver(([entry]) => {
    scale.value = Math.min(
      entry.contentRect.width / 1920,
      entry.contentRect.height / 1080,
    );
  });
  observer.observe(area.value);
});

onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
});
</script>

<template>
  <div ref="area" class="video-frame-canvas">
    <div v-if="scale > 0" ref="frame" class="frame" :style="frameStyle">
      <!-- A document boundary keeps Motion measurements logical, not display-scaled. -->
      <iframe
        class="composition"
        :style="{
          transform: `scale(${scale})`,
          visibility: fontsReady ? 'visible' : 'hidden',
        }"
        srcdoc="<!doctype html><html><head></head><body></body></html>"
        title="Video composition"
        tabindex="-1"
        @load="initializeCaptionDocument"
      ></iframe>
      <Teleport v-if="captionDocumentBody" :to="captionDocumentBody">
        <CaptionCanvas
          :key="props.sessionRevision"
          :committed-captions="props.session.captions"
          :active-text="props.session.text"
          :layout="props.layout"
          :show-caret="props.showCaret"
          :on-animation-update="useStudioAnimationClock"
        />
      </Teleport>
      <button
        ref="handle"
        type="button"
        class="anchor"
        :class="{ 'anchor--dragging': dragging }"
        :style="{
          left: `${props.layout.position.x * 100}%`,
          top: `${props.layout.position.y * 100}%`,
        }"
        aria-label="Caption position. Drag or use arrow keys. Enter returns to typing."
        title="Drag or use arrow keys to position captions"
        @pointerdown.stop="startDrag"
        @pointermove="drag"
        @pointerup="stopDrag"
        @pointercancel="stopDrag"
        @lostpointercapture="stopDrag"
        @keydown="keyMove"
      ></button>
    </div>
  </div>
</template>

<style scoped>
.video-frame-canvas {
  display: grid;
  place-items: center;
  pointer-events: none;
}

.frame {
  position: relative;
  overflow: hidden;
  background: rgb(0 0 0 / 10%);
  border-radius: var(--radius-sm);
}

.composition {
  position: absolute;
  top: 0;
  left: 0;
  width: 1920px;
  height: 1080px;
  border: 0;
  transform-origin: top left;
}

.anchor {
  position: absolute;
  width: 28px;
  height: 28px;
  padding: 0;
  transform: translate(-50%, -50%);
  border: 0;
  border-radius: 50%;
  background: transparent;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.anchor::after {
  content: '';
  position: absolute;
  inset: 9px;
  border: 1px solid rgb(255 255 255 / 65%);
  border-radius: 50%;
  background: rgb(0 0 0 / 25%);
}

.anchor--dragging {
  cursor: grabbing;
}

.anchor:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 1px;
}
</style>

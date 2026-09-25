<script setup lang="ts">
import { computed } from 'vue';

import Caption from './caption.vue';
import {
  ECaptionHistoryDirection,
  type TCaptionLayout,
} from './captions.model';

type TProps = {
  committedCaptions: string[];
  activeText: string;
  layout: TCaptionLayout;
  showCaret: boolean;
};

const props = defineProps<TProps>();

const visibleCaptions = computed(() => {
  const start = Math.max(0, props.committedCaptions.length - 3);

  return props.committedCaptions.slice(start).map((text, index) => ({
    text,
    key: start + index,
    active: false,
  }));
});

const renderedCaptions = computed(() => {
  const committed = visibleCaptions.value;

  const active = props.activeText
    ? [
        {
          text: props.activeText,
          key: 'active',
          active: true,
        },
      ]
    : [];

  if (props.layout.historyDirection === ECaptionHistoryDirection.Down) {
    return [...active, ...[...committed].reverse()];
  }

  return [...committed, ...active];
});
</script>

<template>
  <div
    class="caption-canvas"
    :class="[
      `caption-canvas--align-${props.layout.horizontalAlignment}`,
      `caption-canvas--history-${props.layout.historyDirection}`,
    ]"
    :style="{
      '--caption-x': `${props.layout.position.x * 100}%`,
      '--caption-y': `${props.layout.position.y * 100}%`,
      '--caption-max-width': `${props.layout.maxWidth}px`,
    }"
  >
    <div class="caption-canvas__stack">
      <Caption
        v-for="caption in renderedCaptions"
        :key="caption.key"
        :text="caption.text"
        :active="caption.active"
        :show-caret="caption.active && props.showCaret"
      />
    </div>
  </div>
</template>

<style scoped>
.caption-canvas {
  --lane-width: min(var(--caption-max-width), 100%);

  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.caption-canvas__stack {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: var(--caption-gap);
  width: var(--lane-width);
}

/* Horizontal anchor */

.caption-canvas--align-left .caption-canvas__stack {
  left: var(--caption-x);
  align-items: flex-start;
}

.caption-canvas--align-center .caption-canvas__stack {
  left: var(--caption-x);
  transform: translateX(-50%);
  align-items: center;
}

.caption-canvas--align-right .caption-canvas__stack {
  left: var(--caption-x);
  transform: translateX(-100%);
  align-items: flex-end;
}

/* Vertical anchor */

.caption-canvas--history-up .caption-canvas__stack {
  bottom: calc(100% - var(--caption-y));
  justify-content: flex-end;
}

.caption-canvas--history-down .caption-canvas__stack {
  top: var(--caption-y);
  justify-content: flex-start;
}
</style>

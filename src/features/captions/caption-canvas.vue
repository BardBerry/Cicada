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
const MAX_VISIBLE_COMMITTED_CAPTIONS = 3;

const renderedCaptions = computed(() => {
  const start = Math.max(
    0,
    props.committedCaptions.length - (MAX_VISIBLE_COMMITTED_CAPTIONS + 1),
  );

  const hasExitingCaption =
    props.committedCaptions.length > MAX_VISIBLE_COMMITTED_CAPTIONS;

  const committed = props.committedCaptions.slice(start).map((text, index) => ({
    text,
    key: start + index,
    active: false,
    placeholder: false,
    exiting: hasExitingCaption && index === 0,
  }));

  const anchorCaption = {
    text: props.activeText || '\u00a0',
    key: props.committedCaptions.length,
    active: Boolean(props.activeText),
    placeholder: !props.activeText,
    exiting: false,
  };

  if (props.layout.historyDirection === ECaptionHistoryDirection.Down) {
    return [anchorCaption, ...committed.reverse()];
  }

  return [...committed, anchorCaption];
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
    <TransitionGroup name="caption-item" tag="div" class="stack">
      <div
        v-for="caption in renderedCaptions"
        :key="caption.key"
        class="item"
        :class="{
          'item--placeholder': caption.placeholder,
          'item--exiting': caption.exiting,
        }"
      >
        <Caption
          :text="caption.text"
          :active="caption.active"
          :show-caret="caption.active && props.showCaret"
        />
      </div>
    </TransitionGroup>
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

.stack {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: var(--caption-gap);
  width: var(--lane-width);
}

.item {
  display: flex;
  width: 100%;
  transition: opacity var(--caption-fade-duration) var(--caption-motion-easing);
}

/* Horizontal anchor */

.caption-canvas--align-left .item {
  justify-content: flex-start;
}

.caption-canvas--align-center .item {
  justify-content: center;
}

.caption-canvas--align-right .item {
  justify-content: flex-end;
}

.caption-canvas--align-left .stack {
  left: var(--caption-x);
}

.caption-canvas--align-center .stack {
  left: var(--caption-x);
  transform: translateX(-50%);
}

.caption-canvas--align-right .stack {
  left: var(--caption-x);
  transform: translateX(-100%);
}

/* Vertical anchor */

.caption-canvas--history-up .stack {
  bottom: calc(100% - var(--caption-y));
  justify-content: flex-end;
}

.caption-canvas--history-down .stack {
  top: var(--caption-y);
  justify-content: flex-start;
}

.item--placeholder,
.item--exiting {
  opacity: 0;
}

.caption-item-move {
  transition:
    transform var(--caption-move-duration) var(--caption-motion-easing),
    opacity var(--caption-fade-duration) var(--caption-motion-easing);
}
</style>

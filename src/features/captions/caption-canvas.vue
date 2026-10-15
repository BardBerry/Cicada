<script setup lang="ts">
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'motion-v';
import { computed, useId } from 'vue';

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
  onAnimationUpdate?: () => void;
  static?: boolean;
};

const props = defineProps<TProps>();

const layoutGroupId = useId();

const MAX_VISIBLE_COMMITTED_CAPTIONS = 3;

const captionTransition = {
  type: 'tween' as const,
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

const activeCaptionId = computed(() => props.committedCaptions.length);

const layoutDependency = computed(
  () => `${props.committedCaptions.length}:${props.layout.historyDirection}`,
);

const renderedHistory = computed(() => {
  const start = Math.max(
    0,
    props.committedCaptions.length - MAX_VISIBLE_COMMITTED_CAPTIONS,
  );

  const captions = props.committedCaptions.slice(start).map((text, index) => ({
    id: start + index,
    text,
  }));

  if (props.layout.historyDirection === ECaptionHistoryDirection.Down) {
    return captions.reverse();
  }

  return captions;
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
    <MotionConfig
      reduced-motion="never"
      :skip-animations="props.static ?? false"
    >
      <LayoutGroup :id="layoutGroupId">
        <div class="lane">
          <div class="anchor">
            <motion.div
              :key="activeCaptionId"
              class="item"
              :layout-id="
                props.static ? undefined : `caption-${activeCaptionId}`
              "
              :layout="props.static ? false : 'position'"
              :layout-dependency="layoutDependency"
              :initial="false"
              :animate="{
                opacity: props.activeText ? 1 : 0,
              }"
              :transition="captionTransition"
              :on-update="props.onAnimationUpdate"
            >
              <Caption
                :text="props.activeText || '\u00a0'"
                :active="Boolean(props.activeText)"
                :show-caret="Boolean(props.activeText) && props.showCaret"
              />
            </motion.div>

            <div class="history">
              <AnimatePresence mode="sync">
                <motion.div
                  v-for="caption in renderedHistory"
                  :key="caption.id"
                  class="item"
                  :layout-id="
                    props.static ? undefined : `caption-${caption.id}`
                  "
                  :layout="props.static ? false : 'position'"
                  :layout-dependency="layoutDependency"
                  :initial="false"
                  :animate="{ opacity: 1 }"
                  :exit="{
                    opacity: 0,
                    y:
                      props.layout.historyDirection ===
                      ECaptionHistoryDirection.Up
                        ? -12
                        : 12,
                  }"
                  :transition="captionTransition"
                  :on-update="props.onAnimationUpdate"
                >
                  <Caption
                    :text="caption.text"
                    :active="false"
                    :show-caret="false"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
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

.lane {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--lane-width);
}

.anchor {
  position: absolute;
  top: var(--caption-y);
  left: 0;

  display: flex;
  width: 100%;

  transform: translateY(-50%);
}

.item {
  display: flex;
  min-width: 0;
  max-width: 100%;
}

.history {
  position: absolute;
  left: 0;

  display: flex;
  flex-direction: column;
  gap: var(--caption-gap);

  width: 100%;
}

/* Horizontal anchor */

.caption-canvas--align-left .lane {
  left: var(--caption-x);
}

.caption-canvas--align-center .lane {
  left: var(--caption-x);
  transform: translateX(-50%);
}

.caption-canvas--align-right .lane {
  left: var(--caption-x);
  transform: translateX(-100%);
}

.caption-canvas--align-left .anchor {
  justify-content: flex-start;
}

.caption-canvas--align-center .anchor {
  justify-content: center;
}

.caption-canvas--align-right .anchor {
  justify-content: flex-end;
}

.caption-canvas--align-left .history {
  align-items: flex-start;
}

.caption-canvas--align-center .history {
  align-items: center;
}

.caption-canvas--align-right .history {
  align-items: flex-end;
}

/* Vertical history direction */

.caption-canvas--history-up .history {
  bottom: calc(100% + var(--caption-gap));
}

.caption-canvas--history-down .history {
  top: calc(100% + var(--caption-gap));
}
</style>

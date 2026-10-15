import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';

import {
  ECaptionHistoryDirection,
  ECaptionHorizontalAlignment,
  type TCaptionLayout,
  type TCaptionPosition,
} from './captions.model';

const VIDEO_FRAME_POSITION_KEY = 'cicada.video-frame-position';

function readVideoFramePosition(): TCaptionPosition {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(VIDEO_FRAME_POSITION_KEY) ?? 'null',
    );
    if (
      value !== null &&
      typeof value === 'object' &&
      'x' in value &&
      typeof value.x === 'number' &&
      Number.isFinite(value.x) &&
      value.x >= 0 &&
      value.x <= 1 &&
      'y' in value &&
      typeof value.y === 'number' &&
      Number.isFinite(value.y) &&
      value.y >= 0 &&
      value.y <= 1
    )
      return { x: value.x, y: value.y };
  } catch {
    // Missing storage access and invalid JSON both fall back to the default anchor.
  }
  return { x: 0.5, y: 0.5 };
}

export const useCaptionLayoutStore = defineStore('caption-layout', () => {
  const layout = reactive<TCaptionLayout>({
    position: {
      x: 0.5,
      y: 0.5,
    },
    horizontalAlignment: ECaptionHorizontalAlignment.Center,
    historyDirection: ECaptionHistoryDirection.Up,
    maxWidth: 500,
  });
  const videoFramePosition = ref<TCaptionPosition>(readVideoFramePosition());
  const videoFrameLayout = computed<TCaptionLayout>(() => ({
    ...layout,
    position: { ...videoFramePosition.value },
  }));

  watch(
    videoFramePosition,
    (position) => {
      try {
        localStorage.setItem(
          VIDEO_FRAME_POSITION_KEY,
          JSON.stringify(position),
        );
      } catch {
        // Keep editing usable when storage is unavailable; the preference remains in memory.
      }
    },
    { deep: true, flush: 'sync' },
  );

  return {
    layout,
    videoFramePosition,
    videoFrameLayout,
  };
});

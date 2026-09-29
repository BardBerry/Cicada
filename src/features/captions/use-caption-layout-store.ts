import { defineStore } from 'pinia';
import { reactive } from 'vue';

import {
  ECaptionHistoryDirection,
  ECaptionHorizontalAlignment,
  type TCaptionLayout,
} from './captions.model';

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

  return {
    layout,
  };
});

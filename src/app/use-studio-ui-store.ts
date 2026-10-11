import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { EStudioMode } from '../pages/studio/studio.model';

export const useStudioUiStore = defineStore('studio-ui', () => {
  const studioMode = ref<EStudioMode>(EStudioMode.Studio);
  const isChromaMode = computed(() => studioMode.value === EStudioMode.Chroma);

  function exitChromaMode() {
    studioMode.value = EStudioMode.Studio;
  }

  function enterChromaMode() {
    studioMode.value = EStudioMode.Chroma;
  }

  return {
    studioMode,
    isChromaMode,
    exitChromaMode,
    enterChromaMode,
  };
});

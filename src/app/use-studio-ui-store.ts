import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { EStudioMode } from '../pages/studio/studio.model';

export const useStudioUiStore = defineStore('studio-ui', () => {
  const studioMode = ref<EStudioMode>(EStudioMode.Studio);
  const isZenMode = computed(() => studioMode.value === EStudioMode.Zen);

  function exitZenMode() {
    studioMode.value = EStudioMode.Studio;
  }

  function enterZenMode() {
    studioMode.value = EStudioMode.Zen;
  }

  return {
    studioMode,
    isZenMode,
    exitZenMode,
    enterZenMode,
  };
});

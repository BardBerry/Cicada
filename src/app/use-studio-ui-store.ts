import { defineStore } from 'pinia';
import { ref } from 'vue';

import { EStudioView } from '../pages/studio/studio.model';

export const useStudioUiStore = defineStore('studio-ui', () => {
  const view = ref(EStudioView.Workspace);
  const isChromaMode = ref(false);

  function selectView(nextView: EStudioView) {
    isChromaMode.value = false;
    view.value = nextView;
  }

  function exitChromaMode() {
    isChromaMode.value = false;
  }

  function enterChromaMode() {
    if (view.value !== EStudioView.Workspace) return;
    isChromaMode.value = true;
  }

  return {
    isChromaMode,
    view,
    selectView,
    exitChromaMode,
    enterChromaMode,
  };
});

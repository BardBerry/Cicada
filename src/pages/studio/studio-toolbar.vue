<script setup lang="ts">
import UiButton from '@/shared/ui/ui-button.vue';

import { EStudioView } from './studio.model';

type TProps = {
  view: EStudioView;
  canEnterChroma: boolean;
};

const props = defineProps<TProps>();
const emit = defineEmits<{
  selectView: [view: EStudioView];
  enterChroma: [];
}>();
</script>

<template>
  <div class="studio-toolbar" role="group" aria-label="Studio views">
    <div class="segments" role="group" aria-label="Studio view">
      <UiButton
        control-size="sm"
        class="segment"
        :class="{ 'segment--selected': props.view === EStudioView.Workspace }"
        :aria-pressed="props.view === EStudioView.Workspace"
        @click="emit('selectView', EStudioView.Workspace)"
        >Workspace</UiButton
      >
      <UiButton
        control-size="sm"
        class="segment"
        :class="{ 'segment--selected': props.view === EStudioView.VideoFrame }"
        :aria-pressed="props.view === EStudioView.VideoFrame"
        @click="emit('selectView', EStudioView.VideoFrame)"
        >Video Frame</UiButton
      >
    </div>
    <span class="divider" aria-hidden="true"></span>
    <UiButton
      control-size="sm"
      class="chroma"
      :aria-disabled="!props.canEnterChroma"
      @click="props.canEnterChroma && emit('enterChroma')"
      ><span class="swatch" aria-hidden="true"></span>Chroma</UiButton
    >
  </div>
</template>

<style scoped>
.studio-toolbar {
  --ui-button-secondary-background: transparent;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: max-content;
  padding: var(--space-2);
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

.segments {
  display: flex;
  background: var(--app-surface-raised);
  border-radius: 10px;
  padding: var(--space-1);
}

.segment--selected {
  --ui-button-secondary-background: var(--app-background);
  --ui-button-secondary-hover-background: var(--app-background);
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--app-border);
}

.chroma {
  --ui-button-secondary-hover-background: transparent;
}

.chroma[aria-disabled='true'] {
  opacity: 0.45;
  cursor: not-allowed;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 1px;
  background: var(--app-chroma-color);
}
</style>

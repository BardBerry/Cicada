<script setup lang="ts">
import {
  CircleIcon,
  MaximizeIcon,
  PlayIcon,
  PlusIcon,
  SaveIcon,
  SquareIcon,
} from '@lucide/vue';

import UiButton from '@/shared/ui/ui-button.vue';

type TProps = {
  isRecording: boolean;
  isReplaying: boolean;
  canRecord: boolean;
  isRecordingPreview: boolean;
  isSavedRecording: boolean;
  canSave: boolean;
  canStartNew: boolean;
  isSaving: boolean;
  isRetry: boolean;
};

const props = defineProps<TProps>();

const emit = defineEmits<{
  toggleRecording: [];
  toggleReplay: [];
  enterZen: [];
  saveRecording: [];
  newRecording: [];
}>();
</script>

<template>
  <div class="studio-controls" role="group" aria-label="Studio controls">
    <UiButton
      v-if="props.isRecordingPreview && !props.isSavedRecording"
      :icon="SaveIcon"
      :disabled="!props.canSave"
      @click="emit('saveRecording')"
    >
      {{ props.isSaving ? 'Saving...' : props.isRetry ? 'Retry Save' : 'Save' }}
    </UiButton>

    <UiButton
      v-if="props.isRecordingPreview"
      class="replay"
      :icon="props.isReplaying ? SquareIcon : PlayIcon"
      :disabled="props.isRecording"
      :aria-label="props.isReplaying ? 'Stop replay' : 'Replay'"
      @click="emit('toggleReplay')"
    >
      <span class="label">
        <span class="label-text">
          {{ props.isReplaying ? 'Stop' : 'Replay' }}
        </span>
        <span class="label-measure" aria-hidden="true"> Replay </span>
      </span>
    </UiButton>

    <UiButton
      v-if="!props.isSavedRecording"
      class="record"
      :class="{
        'record--recording': props.isRecording,
      }"
      variant="primary"
      :icon="props.isRecording ? SquareIcon : CircleIcon"
      :disabled="!props.isRecording && !props.canRecord"
      :aria-label="props.isRecording ? 'Stop recording' : 'Record'"
      @click="emit('toggleRecording')"
    >
      <span class="label">
        <span class="label-text">
          {{ props.isRecording ? 'Stop' : 'Record' }}
        </span>
        <span class="label-measure" aria-hidden="true"> Record </span>
      </span>
    </UiButton>

    <UiButton
      v-if="props.isSavedRecording"
      :icon="PlusIcon"
      :disabled="!props.canStartNew"
      aria-label="New recording"
      @click="emit('newRecording')"
    >
      New
    </UiButton>

    <span class="divider" aria-hidden="true"></span>

    <UiButton class="zen" :icon="MaximizeIcon" @click="emit('enterZen')">
      Zen
    </UiButton>
  </div>
</template>

<style scoped>
.studio-controls {
  --ui-button-secondary-background: transparent;
  --ui-button-secondary-hover-background: var(--app-surface-raised);

  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

.record {
  --ui-button-primary-background: var(--app-live);
  --ui-button-icon-fill: currentColor;
}

.record--recording {
  --ui-button-primary-background: var(--app-recording);
}

.replay {
  --ui-button-icon-fill: currentColor;
}

.zen {
  --ui-button-icon-stroke-width: 2.5;
}

.label {
  display: inline-grid;
}

.label-text,
.label-measure {
  grid-area: 1 / 1;
}

.label-measure {
  visibility: hidden;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--app-border);
}
</style>

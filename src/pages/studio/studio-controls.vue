<script setup lang="ts">
import {
  CircleIcon,
  CircleXIcon,
  RotateCcwIcon,
  SaveIcon,
  SquareArrowRightEnterIcon,
  SquareIcon,
} from '@lucide/vue';

import UiButton from '@/shared/ui/ui-button.vue';

type TProps = {
  isRecording: boolean;
  isReplaying: boolean;
  canToggleRecording: boolean;
  canToggleReplay: boolean;
  canExport: boolean;
  isRecordingPreview: boolean;
  isSavedRecording: boolean;
  canSave: boolean;
  canDiscardDraft: boolean;
  isSaving: boolean;
  isRetry: boolean;
};

const props = defineProps<TProps>();

const emit = defineEmits<{
  toggleRecording: [];
  toggleReplay: [];
  exportRecording: [];
  saveRecording: [];
  discardDraft: [];
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
      :class="{ 'replay--replaying': props.isReplaying }"
      :icon="props.isReplaying ? SquareIcon : RotateCcwIcon"
      :disabled="!props.canToggleReplay"
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
      v-if="!props.isRecordingPreview"
      class="record"
      :class="{
        'record--recording': props.isRecording,
      }"
      variant="primary"
      :icon="props.isRecording ? SquareIcon : CircleIcon"
      :disabled="!props.canToggleRecording"
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
      v-if="props.isRecordingPreview && !props.isSavedRecording"
      :icon="CircleXIcon"
      :disabled="!props.canDiscardDraft"
      aria-label="Discard draft"
      @click="emit('discardDraft')"
    >
      Discard
    </UiButton>

    <UiButton
      v-if="props.isRecordingPreview"
      :icon="SquareArrowRightEnterIcon"
      :disabled="!props.canExport"
      @click="emit('exportRecording')"
    >
      Export…
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
</style>

<script setup lang="ts">
import { CircleIcon, MaximizeIcon, PlayIcon, SquareIcon } from '@lucide/vue';

import AppButton from '@/shared/ui/app-button.vue';

type TProps = {
  isRecording: boolean;
  isReplaying: boolean;
  canReplay: boolean;
};

const props = defineProps<TProps>();

const emit = defineEmits<{
  toggleRecording: [];
  toggleReplay: [];
  enterZen: [];
}>();
</script>

<template>
  <div class="studio-controls" role="group" aria-label="Studio controls">
    <AppButton
      class="studio-controls__record"
      :class="{
        'studio-controls__record--recording': props.isRecording,
      }"
      variant="primary"
      :icon="props.isRecording ? SquareIcon : CircleIcon"
      :disabled="props.isReplaying"
      :aria-label="props.isRecording ? 'Stop recording' : 'Record'"
      @click="emit('toggleRecording')"
    >
      <span class="studio-controls__label">
        <span class="studio-controls__label-visible">
          {{ props.isRecording ? 'Stop' : 'Record' }}
        </span>
        <span class="studio-controls__label-measure" aria-hidden="true">
          Record
        </span>
      </span>
    </AppButton>

    <AppButton
      class="studio-controls__replay"
      :icon="props.isReplaying ? SquareIcon : PlayIcon"
      :disabled="props.isRecording || (!props.canReplay && !props.isReplaying)"
      :aria-label="props.isReplaying ? 'Stop replay' : 'Replay'"
      @click="emit('toggleReplay')"
    >
      <span class="studio-controls__label">
        <span class="studio-controls__label-visible">
          {{ props.isReplaying ? 'Stop' : 'Replay' }}
        </span>
        <span class="studio-controls__label-measure" aria-hidden="true">
          Replay
        </span>
      </span>
    </AppButton>

    <span class="studio-controls__divider" aria-hidden="true"></span>

    <AppButton
      class="studio-controls__zen"
      :icon="MaximizeIcon"
      @click="emit('enterZen')"
    >
      Zen
    </AppButton>
  </div>
</template>

<style scoped>
.studio-controls {
  --app-button-secondary-background: transparent;
  --app-button-secondary-hover-background: var(--app-surface-raised);

  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

.studio-controls__record {
  --app-button-primary-background: var(--app-live);
  --app-button-icon-fill: currentColor;
}

.studio-controls__record--recording {
  --app-button-primary-background: var(--app-recording);
}

.studio-controls__replay {
  --app-button-icon-fill: currentColor;
}

.studio-controls__zen {
  --app-button-icon-stroke-width: 2.5;
}

.studio-controls__label {
  display: inline-grid;
}

.studio-controls__label-visible,
.studio-controls__label-measure {
  grid-area: 1 / 1;
}

.studio-controls__label-measure {
  visibility: hidden;
}

.studio-controls__divider {
  width: 1px;
  height: 24px;
  background: var(--app-border);
}
</style>

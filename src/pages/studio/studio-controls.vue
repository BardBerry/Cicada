<script setup lang="ts">
import { CircleIcon, PlayIcon, SquareIcon } from '@lucide/vue';

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
      :variant="props.isRecording ? 'recording' : 'primary'"
      :icon="props.isRecording ? SquareIcon : CircleIcon"
      :disabled="props.isReplaying"
      :aria-label="props.isRecording ? 'Stop recording' : 'Record'"
      @click="emit('toggleRecording')"
    >
      {{ props.isRecording ? 'Stop' : 'Record' }}
    </AppButton>

    <AppButton
      :variant="props.isReplaying ? 'replaying' : 'standard'"
      :icon="props.isReplaying ? SquareIcon : PlayIcon"
      :disabled="props.isRecording || (!props.canReplay && !props.isReplaying)"
      :aria-label="props.isReplaying ? 'Stop replay' : 'Replay'"
      @click="emit('toggleReplay')"
    >
      {{ props.isReplaying ? 'Stop' : 'Replay' }}
    </AppButton>

    <span class="studio-controls__divider" aria-hidden="true"></span>

    <AppButton @click="emit('enterZen')">Zen</AppButton>
  </div>
</template>

<style scoped>
.studio-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-md);
}

.studio-controls__divider {
  width: 1px;
  height: 22px;
  background: var(--app-border);
}
</style>

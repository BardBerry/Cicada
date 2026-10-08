<script setup lang="ts">
import { computed } from 'vue';

import { EStudioStatus } from './studio.model';

type TProps = {
  status: EStudioStatus;
  recordingLabel: string | null;
};

const props = defineProps<TProps>();

const label = computed(() => {
  if (props.recordingLabel) {
    return props.status === EStudioStatus.Replaying
      ? `${props.recordingLabel} / Replaying`
      : props.recordingLabel;
  }

  switch (props.status) {
    case EStudioStatus.Recording:
      return 'Recording';

    case EStudioStatus.Replaying:
      return 'Replaying';

    case EStudioStatus.Live:
      return 'Live preview';

    default:
      return '';
  }
});
</script>

<template>
  <div
    class="studio-status"
    :class="`studio-status--${props.status}`"
    role="status"
  >
    <span class="dot" aria-hidden="true"></span>
    {{ label }}
  </div>
</template>

<style scoped>
.studio-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--app-muted);
  pointer-events: none;
}

.dot {
  position: relative;
  top: 1px;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--app-live);
}

.studio-status--recording .dot {
  background: var(--app-recording);
}

.studio-status--replaying .dot {
  background: var(--app-replay);
}
</style>

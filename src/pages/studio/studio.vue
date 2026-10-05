<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onUnmounted, ref, useTemplateRef } from 'vue';

import { EAppCommand } from '@/app/commands/app-command.model';
import { useKeymap } from '@/app/keymap/use-keymap';
import { useStudioUiStore } from '@/app/use-studio-ui-store';
import CaptionCanvas from '@/features/captions/caption-canvas.vue';
import { useCaptionLayoutStore } from '@/features/captions/use-caption-layout-store';
import TypingSurface from '@/features/typing/typing-surface.vue';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
import { useRecordingWorkspaceStore } from '@/features/workspace/use-recording-workspace-store';

import { EStudioStatus } from './studio.model';
import StudioControls from './studio-controls.vue';
import StudioStatus from './studio-status.vue';
import { useStudioRecordingWorkflowStore } from './use-studio-recording-workflow-store';

const typingSurface = useTemplateRef('typingSurface');
const isTypingFocused = ref(false);

const studioUiStore = useStudioUiStore();
const typingSessionStore = useTypingSessionStore();
const captionLayoutStore = useCaptionLayoutStore();
const workspaceStore = useRecordingWorkspaceStore();
const recordingWorkflowStore = useStudioRecordingWorkflowStore();

const { layout: captionLayout } = storeToRefs(captionLayoutStore);
const { studioMode, isZenMode } = storeToRefs(studioUiStore);
const { session, sessionRevision, isRecording, isReplaying } =
  storeToRefs(typingSessionStore);
const { workspaceRecording, workspaceGeneration, saveAttempt } =
  storeToRefs(workspaceStore);
const { captureReplacementTarget } = storeToRefs(recordingWorkflowStore);

const { exitZenMode, enterZenMode } = studioUiStore;
const {
  startRecording,
  stopRecording,
  startReplay,
  stopReplay,
  handleLiveTypingEvent,
} = typingSessionStore;
const { stageRecording } = workspaceStore;
const { retainCaptureReplacementTarget, clearCaptureReplacementTarget } =
  recordingWorkflowStore;

const canRecord = computed(
  () =>
    !isRecording.value &&
    !isReplaying.value &&
    !workspaceRecording.value?.hasUnsavedChanges &&
    !saveAttempt.value &&
    !captureReplacementTarget.value,
);

const isSessionEmpty = computed(
  () => !session.value.text && session.value.captions.length === 0,
);

const showTypingPrompt = computed(
  () =>
    !isZenMode.value &&
    !isTypingFocused.value &&
    !isReplaying.value &&
    isSessionEmpty.value,
);

const studioStatus = computed(() => {
  if (isReplaying.value) {
    return EStudioStatus.Replaying;
  }

  if (isRecording.value) {
    return EStudioStatus.Recording;
  }

  return EStudioStatus.Live;
});

function executeCommand(command: EAppCommand) {
  switch (command) {
    case EAppCommand.StartRecording: {
      if (!canRecord.value) break;

      const target = {
        expectedRecordingId: workspaceRecording.value?.id ?? null,
        expectedGeneration: workspaceGeneration.value,
      };

      if (!startRecording()) break;
      if (!retainCaptureReplacementTarget(target)) {
        stopRecording();
        break;
      }

      typingSurface.value?.focus();
      break;
    }

    case EAppCommand.StopRecording: {
      const target = captureReplacementTarget.value;

      try {
        const recording = stopRecording();
        if (!recording || !target) break;
        if (workspaceRecording.value?.hasUnsavedChanges) break;

        stageRecording({ recording, ...target });
      } finally {
        // A failed stop can leave capture active and still need its original target.
        if (!isRecording.value) clearCaptureReplacementTarget();
      }

      break;
    }

    case EAppCommand.StartReplay:
      if (!workspaceRecording.value || isRecording.value) break;
      typingSurface.value?.blur();
      startReplay(workspaceRecording.value.recording);
      break;

    case EAppCommand.StopReplay:
      stopReplay();
      break;

    case EAppCommand.EnterZenMode:
      enterZenMode();
      typingSurface.value?.focus();
      break;

    case EAppCommand.ExitZenMode:
      exitZenMode();
      break;

    case EAppCommand.FocusCaptionInput:
      typingSurface.value?.focus();
      break;

    case EAppCommand.BlurCaptionInput:
      typingSurface.value?.blur();
      break;
  }
}

useKeymap({
  getContext: () => ({ studioMode: studioMode.value }),
  onCommand: executeCommand,
});

onUnmounted(exitZenMode);
</script>

<template>
  <div class="studio" :class="{ 'studio--zen': isZenMode }">
    <CaptionCanvas
      :key="sessionRevision"
      :committed-captions="session.captions"
      :active-text="session.text"
      :layout="captionLayout"
      :show-caret="isTypingFocused || isReplaying"
    />
    <TypingSurface
      ref="typingSurface"
      :text="session.text"
      :disabled="isReplaying"
      @typing-event="handleLiveTypingEvent"
      @focus="isTypingFocused = true"
      @blur="isTypingFocused = false"
    />
    <div v-if="showTypingPrompt" class="typing-prompt" aria-hidden="true">
      Click anywhere to type
    </div>
    <StudioStatus v-if="!isZenMode" class="status" :status="studioStatus" />
    <StudioControls
      v-if="!isZenMode"
      class="controls"
      :is-recording="isRecording"
      :is-replaying="isReplaying"
      :can-record="canRecord"
      :can-replay="Boolean(workspaceRecording)"
      @toggle-recording="
        executeCommand(
          isRecording ? EAppCommand.StopRecording : EAppCommand.StartRecording,
        )
      "
      @toggle-replay="
        executeCommand(
          isReplaying ? EAppCommand.StopReplay : EAppCommand.StartReplay,
        )
      "
      @enter-zen="executeCommand(EAppCommand.EnterZenMode)"
    />
  </div>
</template>

<style scoped>
.studio {
  --chrome-inset: clamp(var(--space-3), 3vw, 28px);
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--app-background);
  background-image: radial-gradient(
    circle,
    var(--app-border) 1px,
    transparent 1px
  );
  background-size: 18px 18px;
}

.studio--zen {
  background: var(--app-zen-chroma-color);
}

.typing-prompt {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: var(--z-index-2);
  transform: translate(-50%, -50%);
  color: var(--app-muted);
  pointer-events: none;
}

.controls {
  position: absolute;
  z-index: var(--z-index-2);
  bottom: var(--chrome-inset);
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 2 * var(--chrome-inset));
}

.status {
  position: absolute;
  top: var(--chrome-inset);
  right: var(--chrome-inset);
  z-index: var(--z-index-2);
}
</style>

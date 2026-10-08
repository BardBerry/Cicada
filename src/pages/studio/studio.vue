<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, nextTick, onUnmounted, ref, useTemplateRef } from 'vue';

import { EAppCommand } from '@/app/commands/app-command.model';
import { useKeymap } from '@/app/keymap/use-keymap';
import { useStudioUiStore } from '@/app/use-studio-ui-store';
import CaptionCanvas from '@/features/captions/caption-canvas.vue';
import { useCaptionLayoutStore } from '@/features/captions/use-caption-layout-store';
import { useRecordingCatalogStore } from '@/features/recordings/use-recording-catalog-store';
import type { TTypingEvent } from '@/features/typing/typing-event.model';
import TypingSurface from '@/features/typing/typing-surface.vue';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
import { useRecordingWorkspaceActions } from '@/features/workspace/use-recording-workspace-actions';
import { useRecordingWorkspaceStore } from '@/features/workspace/use-recording-workspace-store';
import { EWorkspaceRecordingState } from '@/features/workspace/workspace-recording.model';

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
const catalogStore = useRecordingCatalogStore();
const workspaceActions = useRecordingWorkspaceActions();

const { layout: captionLayout } = storeToRefs(captionLayoutStore);
const { studioMode, isZenMode } = storeToRefs(studioUiStore);
const { session, sessionRevision, isRecording, isReplaying } =
  storeToRefs(typingSessionStore);
const { workspaceRecording, workspaceGeneration, saveAttempt, isSaveInFlight } =
  storeToRefs(workspaceStore);
const { errorMessage, warningMessage } = storeToRefs(catalogStore);
const { captureReplacementTarget } = storeToRefs(recordingWorkflowStore);

const { exitZenMode, enterZenMode } = studioUiStore;
const {
  startRecording,
  stopRecording,
  cancelRecording,
  resetSession,
  startReplay,
  stopReplay,
} = typingSessionStore;
const { stageRecording, clearRecording } = workspaceStore;
const { retainCaptureReplacementTarget, clearCaptureReplacementTarget } =
  recordingWorkflowStore;

const isSavedRecording = computed(
  () => workspaceRecording.value?.state === EWorkspaceRecordingState.Saved,
);

const isRecordingPreview = computed(() => workspaceRecording.value !== null);

const canRecord = computed(
  () =>
    !isRecording.value &&
    !isSavedRecording.value &&
    !isSaveInFlight.value &&
    !captureReplacementTarget.value,
);

const canSave = computed(
  () =>
    workspaceRecording.value?.state === EWorkspaceRecordingState.Temporary &&
    !isRecording.value &&
    !isSaveInFlight.value &&
    !catalogStore.isBusy,
);

const recordingLabel = computed(() => {
  if (!workspaceRecording.value) return null;
  if (!isSavedRecording.value) return 'Draft (unsaved)';

  const summary = catalogStore.recordings.find(
    (item) => item.id === workspaceRecording.value?.id,
  );
  return summary?.name ? `Saved / ${summary.name}` : 'Saved';
});

const isSessionEmpty = computed(
  () => !session.value.text && session.value.captions.length === 0,
);

const showTypingPrompt = computed(
  () =>
    !isZenMode.value &&
    !isRecordingPreview.value &&
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

function handleLiveTypingEvent(event: TTypingEvent) {
  if (isRecordingPreview.value || isReplaying.value) return;
  typingSessionStore.handleLiveTypingEvent(event);
}

function focusLiveInput() {
  const expectedGeneration = workspaceGeneration.value;
  void nextTick(() => {
    if (
      workspaceGeneration.value !== expectedGeneration ||
      isRecordingPreview.value ||
      isReplaying.value
    ) {
      return;
    }

    typingSurface.value?.focus();
  });
}

function executeCommand(command: EAppCommand) {
  switch (command) {
    case EAppCommand.StartRecording: {
      if (!canRecord.value) break;

      // Admit the entire retake before mutating content. A rejected start keeps the take.
      stopReplay();
      if (!startRecording()) break;

      workspaceActions.abandonSaveAttempt();
      clearRecording({
        expectedRecordingId: workspaceRecording.value?.id ?? null,
        expectedGeneration: workspaceGeneration.value,
      });
      retainCaptureReplacementTarget({
        expectedRecordingId: null,
        expectedGeneration: workspaceGeneration.value,
      });

      focusLiveInput();
      break;
    }

    case EAppCommand.StopRecording: {
      const target = captureReplacementTarget.value;

      try {
        const recording = stopRecording();
        if (!recording || !target) break;
        if (
          stageRecording({ recording, ...target }) &&
          workspaceRecording.value
        ) {
          typingSessionStore.showRecording(workspaceRecording.value.recording);
          typingSurface.value?.blur();
        }
      } finally {
        // A failed stop can leave capture active and still need its original target.
        if (!isRecording.value) clearCaptureReplacementTarget();
      }

      break;
    }

    case EAppCommand.NewRecording:
      if (isSaveInFlight.value) break;
      stopReplay();
      cancelRecording();
      clearCaptureReplacementTarget();
      workspaceActions.abandonSaveAttempt();
      clearRecording({
        expectedRecordingId: workspaceRecording.value?.id ?? null,
        expectedGeneration: workspaceGeneration.value,
      });
      resetSession();
      break;

    case EAppCommand.SaveRecording:
      if (canSave.value) void workspaceActions.saveWorkspaceRecording();
      break;

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
      if (!isRecordingPreview.value) typingSurface.value?.focus();
      break;

    case EAppCommand.ExitZenMode:
      exitZenMode();
      break;

    case EAppCommand.FocusCaptionInput:
      if (!isRecordingPreview.value) typingSurface.value?.focus();
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
      :show-caret="(!isRecordingPreview && isTypingFocused) || isReplaying"
    />
    <TypingSurface
      ref="typingSurface"
      :text="session.text"
      :disabled="isReplaying || isRecordingPreview"
      @typing-event="handleLiveTypingEvent"
      @focus="isTypingFocused = true"
      @blur="isTypingFocused = false"
    />
    <div v-if="showTypingPrompt" class="typing-prompt" aria-hidden="true">
      Click anywhere to type
    </div>
    <StudioStatus
      v-if="!isZenMode"
      class="status"
      :status="studioStatus"
      :recording-label="recordingLabel"
    />
    <p
      v-if="!isZenMode && (errorMessage || warningMessage)"
      class="message"
      role="alert"
    >
      {{ errorMessage || warningMessage }}
    </p>
    <StudioControls
      v-if="!isZenMode"
      class="controls"
      :is-recording="isRecording"
      :is-replaying="isReplaying"
      :can-record="canRecord"
      :is-recording-preview="isRecordingPreview"
      :is-saved-recording="isSavedRecording"
      :can-save="canSave"
      :can-start-new="!isSaveInFlight"
      :is-saving="isSaveInFlight"
      :is-retry="Boolean(saveAttempt)"
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
      @save-recording="executeCommand(EAppCommand.SaveRecording)"
      @new-recording="executeCommand(EAppCommand.NewRecording)"
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

.message {
  position: absolute;
  inset: var(--chrome-inset) var(--chrome-inset) auto auto;
  max-width: min(420px, calc(100% - 2 * var(--chrome-inset)));
  margin: var(--space-5) 0 0;
  color: var(--app-muted);
}
</style>

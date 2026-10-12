<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
} from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import { EAppCommand } from '@/app/commands/app-command.model';
import { useAppCommandDispatcher } from '@/app/commands/app-command-context';
import { useStudioUiStore } from '@/app/use-studio-ui-store';
import CaptionCanvas from '@/features/captions/caption-canvas.vue';
import { useCaptionLayoutStore } from '@/features/captions/use-caption-layout-store';
import RecordingPicker from '@/features/recordings/recording-picker.vue';
import { useRecordingCatalogStore } from '@/features/recordings/use-recording-catalog-store';
import type { TTypingEvent } from '@/features/typing/typing-event.model';
import TypingSurface from '@/features/typing/typing-surface.vue';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
import { useRecordingWorkspaceStore } from '@/features/workspace/use-recording-workspace-store';
import { EWorkspaceRecordingState } from '@/features/workspace/workspace-recording.model';
import { isKeyboardEventOwnedByUi } from '@/shared/ui/ui-keyboard-scope';

import { EStudioStatus } from './studio.model';
import StudioControls from './studio-controls.vue';
import StudioStatus from './studio-status.vue';
import { useStudioCommands } from './use-studio-commands';
import { useStudioRecordingPicker } from './use-studio-recording-picker';

const typingSurface = useTemplateRef('typingSurface');
const studio = useTemplateRef('studio');
const isTypingFocused = ref(false);
let isMounted = false;
let detachCommands: (() => void) | undefined;

const appCommands = useAppCommandDispatcher();
const { execute, getAvailability, paletteOpen } = appCommands;
const studioUiStore = useStudioUiStore();
const typingSessionStore = useTypingSessionStore();
const captionLayoutStore = useCaptionLayoutStore();
const workspaceStore = useRecordingWorkspaceStore();
const catalogStore = useRecordingCatalogStore();
const openRecordingAvailability = computed(() =>
  getAvailability(EAppCommand.OpenRecording),
);
const recordingPicker = useStudioRecordingPicker({
  canOpen: () => openRecordingAvailability.value.enabled,
  isPaletteOpen: () => paletteOpen.value,
  focusStudio: () => studio.value?.focus(),
});
const { isOpen: recordingPickerOpen } = recordingPicker;
const studioCommands = useStudioCommands({
  openRecordingPicker: recordingPicker.open,
  focusLiveInput,
  focusCaptionInput: () => typingSurface.value?.focus(),
  blurCaptionInput: () => typingSurface.value?.blur(),
});

const { layout: captionLayout } = storeToRefs(captionLayoutStore);
const { isChromaMode } = storeToRefs(studioUiStore);
const { session, sessionRevision, isRecording, isReplaying } =
  storeToRefs(typingSessionStore);
const { workspaceRecording, workspaceGeneration, saveAttempt, isSaveInFlight } =
  storeToRefs(workspaceStore);
const { errorMessage, warningMessage } = storeToRefs(catalogStore);
const { exitChromaMode } = studioUiStore;

const isSavedRecording = computed(
  () => workspaceRecording.value?.state === EWorkspaceRecordingState.Saved,
);

const isRecordingPreview = computed(() => workspaceRecording.value !== null);

const recordingCommand = computed(() =>
  isRecording.value ? EAppCommand.StopRecording : EAppCommand.StartRecording,
);
const replayCommand = computed(() =>
  isReplaying.value ? EAppCommand.StopReplay : EAppCommand.StartReplay,
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
    !isChromaMode.value &&
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
      !isMounted ||
      paletteOpen.value ||
      recordingPickerOpen.value ||
      workspaceGeneration.value !== expectedGeneration ||
      isRecordingPreview.value ||
      isReplaying.value
    ) {
      return;
    }

    typingSurface.value?.focus();
  });
}

function handleEscape(event: KeyboardEvent) {
  if (
    event.code !== 'Escape' ||
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isKeyboardEventOwnedByUi(event)
  ) {
    return;
  }

  if (isTypingFocused.value) {
    typingSurface.value?.blur();
    event.preventDefault();
  } else if (isChromaMode.value) {
    execute(EAppCommand.ExitChromaMode);
    event.preventDefault();
  }
}

onBeforeRouteLeave(() => !isRecording.value);

onMounted(() => {
  isMounted = true;
  detachCommands = appCommands.registerOwner(studioCommands);
  window.addEventListener('keydown', handleEscape);
});

onBeforeUnmount(() => {
  isMounted = false;
  detachCommands?.();
  window.removeEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  if (isReplaying.value) {
    const recording = workspaceRecording.value?.recording;
    if (recording) typingSessionStore.showRecording(recording);
    else typingSessionStore.stopReplay();
  }
  exitChromaMode();
});
</script>

<template>
  <div
    ref="studio"
    class="studio"
    :class="{ 'studio--chroma': isChromaMode }"
    tabindex="-1"
  >
    <RecordingPicker
      v-model:open="recordingPickerOpen"
      :recordings="catalogStore.recordings"
      :current-recording-id="
        isSavedRecording ? (workspaceRecording?.id ?? null) : null
      "
      :loading="catalogStore.isBusy"
      :error-message="errorMessage"
      :disabled-reason="openRecordingAvailability.disabledReason"
      @select="recordingPicker.openRecording"
      @retry="catalogStore.listRecordings()"
      @close-focus="recordingPicker.handleCloseFocus"
    />
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
      v-if="!isChromaMode"
      class="status"
      :status="studioStatus"
      :recording-label="recordingLabel"
    />
    <p
      v-if="!isChromaMode && (errorMessage || warningMessage)"
      class="message"
      role="alert"
    >
      {{ errorMessage || warningMessage }}
    </p>
    <StudioControls
      v-if="!isChromaMode"
      class="controls"
      :is-recording="isRecording"
      :is-replaying="isReplaying"
      :can-toggle-recording="getAvailability(recordingCommand).enabled"
      :is-recording-preview="isRecordingPreview"
      :is-saved-recording="isSavedRecording"
      :can-toggle-replay="getAvailability(replayCommand).enabled"
      :can-save="getAvailability(EAppCommand.SaveRecording).enabled"
      :can-clear-session="getAvailability(EAppCommand.ClearSession).enabled"
      :can-discard-draft="getAvailability(EAppCommand.DiscardDraft).enabled"
      :can-enter-chroma="getAvailability(EAppCommand.EnterChromaMode).enabled"
      :is-saving="isSaveInFlight"
      :is-retry="Boolean(saveAttempt)"
      @toggle-recording="execute(recordingCommand)"
      @toggle-replay="execute(replayCommand)"
      @enter-chroma="execute(EAppCommand.EnterChromaMode)"
      @save-recording="execute(EAppCommand.SaveRecording)"
      @clear-session="execute(EAppCommand.ClearSession)"
      @discard-draft="execute(EAppCommand.DiscardDraft)"
      @close-recording="execute(EAppCommand.NewSession)"
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

.studio--chroma {
  background: var(--app-chroma-color);
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

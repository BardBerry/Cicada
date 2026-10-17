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
import VideoFrameCanvas from '@/features/captions/video-frame-canvas.vue';
import RecordingExportDialog from '@/features/recording-export/recording-export-dialog.vue';
import RecordingPicker from '@/features/recordings/recording-picker.vue';
import { useRecordingCatalogStore } from '@/features/recordings/use-recording-catalog-store';
import type { TTypingEvent } from '@/features/typing/typing-event.model';
import TypingSurface from '@/features/typing/typing-surface.vue';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
import { useRecordingWorkspaceStore } from '@/features/workspace/use-recording-workspace-store';
import { EWorkspaceRecordingState } from '@/features/workspace/workspace-recording.model';
import { isKeyboardEventOwnedByUi } from '@/shared/ui/ui-keyboard-scope';

import { EStudioStatus, EStudioView } from './studio.model';
import StudioControls from './studio-controls.vue';
import StudioStatus from './studio-status.vue';
import StudioToolbar from './studio-toolbar.vue';
import { useStudioCommands } from './use-studio-commands';
import { useStudioRecordingPicker } from './use-studio-recording-picker';

const typingSurface = useTemplateRef('typingSurface');
const studio = useTemplateRef('studio');
const isTypingFocused = ref(false);
const exportDialogOpen = ref(false);
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
  openExportDialog: () => {
    exportDialogOpen.value = true;
  },
  focusLiveInput,
  focusCaptionInput: () => typingSurface.value?.focus(),
  blurCaptionInput: () => typingSurface.value?.blur(),
});

const {
  layout: captionLayout,
  videoFramePosition,
  videoFrameLayout,
} = storeToRefs(captionLayoutStore);
const { isChromaMode, view } = storeToRefs(studioUiStore);
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

function selectStudioView(nextView: EStudioView) {
  execute(
    nextView === EStudioView.Workspace
      ? EAppCommand.SelectWorkspaceView
      : EAppCommand.SelectVideoFrameView,
  );
}

function focusLiveInput() {
  const expectedGeneration = workspaceGeneration.value;
  void nextTick(() => {
    if (
      !isMounted ||
      paletteOpen.value ||
      recordingPickerOpen.value ||
      exportDialogOpen.value ||
      workspaceGeneration.value !== expectedGeneration
    ) {
      return;
    }

    if (isRecordingPreview.value || isReplaying.value) studio.value?.focus();
    else typingSurface.value?.focus();
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

  if (isChromaMode.value) {
    execute(EAppCommand.ExitChromaMode);
    event.preventDefault();
  } else if (isTypingFocused.value) {
    typingSurface.value?.blur();
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
    <RecordingExportDialog
      v-if="exportDialogOpen && workspaceRecording"
      v-model:open="exportDialogOpen"
      :recording="workspaceRecording.recording"
      :layout="videoFrameLayout"
      @close-focus="
        $event.preventDefault();
        studio?.focus();
      "
    />
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
    <StudioToolbar
      v-if="!isChromaMode"
      class="toolbar"
      :view="view"
      :can-enter-chroma="getAvailability(EAppCommand.EnterChromaMode).enabled"
      @select-view="selectStudioView"
      @enter-chroma="execute(EAppCommand.EnterChromaMode)"
    />
    <VideoFrameCanvas
      v-if="view === EStudioView.VideoFrame"
      class="video-frame-area"
      :session="session"
      :session-revision="sessionRevision"
      :layout="videoFrameLayout"
      :show-caret="(!isRecordingPreview && isTypingFocused) || isReplaying"
      @update:position="videoFramePosition = $event"
      @finish-positioning="focusLiveInput"
    />
    <CaptionCanvas
      v-else
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
    <div v-if="!isChromaMode" class="message">
      <p v-if="errorMessage || warningMessage" role="alert">
        {{ errorMessage || warningMessage }}
      </p>
    </div>
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
      :can-discard-draft="getAvailability(EAppCommand.DiscardDraft).enabled"
      :can-export="getAvailability(EAppCommand.ExportRecording).enabled"
      :is-saving="isSaveInFlight"
      :is-retry="Boolean(saveAttempt)"
      @toggle-recording="execute(recordingCommand)"
      @toggle-replay="execute(replayCommand)"
      @export-recording="execute(EAppCommand.ExportRecording)"
      @save-recording="execute(EAppCommand.SaveRecording)"
      @discard-draft="execute(EAppCommand.DiscardDraft)"
    />
  </div>
</template>

<style scoped>
.studio {
  --chrome-inset: clamp(var(--space-3), 3vw, 28px);
  --toolbar-clearance: 76px;
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

.video-frame-area {
  position: absolute;
  inset: 84px var(--chrome-inset);
  z-index: var(--z-index-2);
}

.toolbar {
  position: absolute;
  top: var(--chrome-inset);
  left: 50%;
  z-index: var(--z-index-3);
  transform: translateX(-50%);
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
  min-height: calc(var(--font-size-xl) * 1.5);
  max-width: min(320px, calc(50% - 160px - var(--chrome-inset)));
}

.message {
  position: absolute;
  inset: calc(var(--chrome-inset) + var(--toolbar-clearance))
    var(--chrome-inset) auto auto;
  max-width: min(420px, calc(100% - 2 * var(--chrome-inset)));
  margin: var(--space-6) 0 0;
  color: var(--app-muted);
  overflow-wrap: anywhere;
}

.message p {
  margin: 0;
}
</style>

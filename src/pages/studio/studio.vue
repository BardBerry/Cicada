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

import { EStudioStatus } from './studio.model';
import StudioControls from './studio-controls.vue';
import StudioStatus from './studio-status.vue';

const typingSurface = useTemplateRef('typingSurface');
const isTypingFocused = ref(false);

const studioUiStore = useStudioUiStore();
const typingSessionStore = useTypingSessionStore();
const captionLayoutStore = useCaptionLayoutStore();

const { layout: captionLayout } = storeToRefs(captionLayoutStore);
const { studioMode, isZenMode } = storeToRefs(studioUiStore);
const { session, sessionRevision, lastRecording, isRecording, isReplaying } =
  storeToRefs(typingSessionStore);

const { exitZenMode, enterZenMode } = studioUiStore;
const {
  startRecording,
  stopRecording,
  startReplay,
  stopReplay,
  handleLiveTypingEvent,
} = typingSessionStore;

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
    case EAppCommand.StartRecording:
      startRecording();
      typingSurface.value?.focus();
      break;

    case EAppCommand.StopRecording:
      stopRecording();
      break;

    case EAppCommand.StartReplay:
      typingSurface.value?.blur();
      startReplay();
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
      :can-replay="Boolean(lastRecording)"
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

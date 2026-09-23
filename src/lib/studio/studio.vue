<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useTypingSession } from './use-typing-session';
import CaptureCaptionCanvas from '../captions/capture-caption-canvas.vue';
import { EAppCommand } from '../commands/app-command.model';
import { EStudioMode } from './studio.model';
import StudioCaptionCanvas from '../captions/studio-caption-canvas.vue';
import { useKeymap } from '../keymap/use-keymap';
import TypingSurface from '../typing/typing-surface.vue';

const typingSurface = useTemplateRef('typingSurface');
const studioMode = ref(EStudioMode.Studio);

function focusCaptionInput() {
  typingSurface.value?.focus();
}

function blurCaptionInput() {
  typingSurface.value?.blur();
}

const {
  session,
  lastRecording,
  isRecording,
  isReplaying,
  startRecording,
  stopRecording,
  startReplay,
  stopReplay,
  handleLiveTypingEvent,
} = useTypingSession();

function executeCommand(command: EAppCommand) {
  switch (command) {
    case EAppCommand.StartRecording:
      startRecording();
      focusCaptionInput();
      break;

    case EAppCommand.StopRecording:
      stopRecording();
      break;

    case EAppCommand.StartReplay:
      startReplay();
      break;

    case EAppCommand.StopReplay:
      stopReplay();
      break;

    case EAppCommand.EnterCaptureMode:
      studioMode.value = EStudioMode.Capture;
      focusCaptionInput();
      break;

    case EAppCommand.ExitCaptureMode:
      studioMode.value = EStudioMode.Studio;
      break;

    case EAppCommand.FocusCaptionStage:
      focusCaptionInput();
      break;

    case EAppCommand.BlurCaptionStage:
      blurCaptionInput();
      break;
  }
}

useKeymap({
  getContext: () => ({ studioMode: studioMode.value }),
  onCommand: executeCommand,
});
</script>

<template>
  <div class="studio">
    <div
      class="studio__stage"
      :class="{
        'studio__stage--capture': studioMode === EStudioMode.Capture,
      }"
    >
      <StudioCaptionCanvas
        v-if="studioMode === EStudioMode.Studio"
        :committed-captions="session.captions"
        :active-text="session.text"
      />
      <CaptureCaptionCanvas
        v-else
        :committed-captions="session.captions"
        :active-text="session.text"
      />
      <TypingSurface
        ref="typingSurface"
        :text="session.text"
        :disabled="isReplaying"
        @typing-event="handleLiveTypingEvent"
      />
    </div>

    <div v-if="studioMode === EStudioMode.Studio">
      <button
        :disabled="isRecording || isReplaying"
        @click="executeCommand(EAppCommand.StartRecording)"
      >
        Record
      </button>
      <button
        :disabled="!isRecording"
        @click="executeCommand(EAppCommand.StopRecording)"
      >
        Stop
      </button>
      <button
        v-if="!isReplaying"
        :disabled="!lastRecording || isRecording"
        @click="executeCommand(EAppCommand.StartReplay)"
      >
        Replay
      </button>
      <button v-else @click="executeCommand(EAppCommand.StopReplay)">
        Stop Replay
      </button>
      <button @click="executeCommand(EAppCommand.EnterCaptureMode)">
        Capture
      </button>
    </div>
  </div>
</template>

<style scoped>
.studio {
  display: flex;
  flex-direction: column;
  align-items: center;

  width: 100%;
  height: 100%;
}

.studio__stage {
  position: relative;
  width: 80%;
  height: 50%;
}

.studio__stage:focus-within {
  --caption-stage-focus-color: lightsteelblue;
}

.studio__stage--capture {
  width: 100%;
  height: 100%;
}
</style>

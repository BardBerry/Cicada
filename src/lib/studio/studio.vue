<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useTypingSession } from './use-typing-session';
import CaptureCaptionCanvas from '../captions/capture-caption-canvas.vue';
import { EAppCommand } from '../commands/app-command.model';
import { EStudioMode } from './studio.model';
import StudioCaptionCanvas from '../captions/studio-caption-canvas.vue';
import { useKeymap } from '../keymap/use-keymap';
import TypingSurface from '../typing/typing-surface.vue';
import AppButton from '../ui/app-button.vue';

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
  <div
    class="studio"
    :class="{ 'studio--capture': studioMode === EStudioMode.Capture }"
  >
    <header v-if="studioMode === EStudioMode.Studio" class="studio__header">
      <h1 class="studio__title">Cicada</h1>
      <span
        class="studio__status"
        :class="{
          'studio__status--recording': isRecording,
          'studio__status--replaying': isReplaying,
        }"
        role="status"
      >
        <span class="studio__status-dot" aria-hidden="true"></span>
        {{
          isRecording ? 'Recording' : isReplaying ? 'Replaying' : 'Live preview'
        }}
      </span>
    </header>

    <div v-if="studioMode === EStudioMode.Studio" class="studio__heading">
      <span class="studio__eyebrow">Typing studio</span>
      <span class="studio__tagline">A little space for your words</span>
    </div>

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

    <p v-if="studioMode === EStudioMode.Studio" class="studio__hint">
      <template v-if="isReplaying"
        >Playing back your words and pauses.</template
      >
      <template v-else>
        Click the stage to type. <kbd>Enter</kbd> starts the next thought.
      </template>
    </p>

    <footer v-if="studioMode === EStudioMode.Studio" class="studio__footer">
      <div class="studio__controls">
        <AppButton
          variant="primary"
          :disabled="isRecording || isReplaying"
          @click="executeCommand(EAppCommand.StartRecording)"
        >
          <span class="studio__record-dot" aria-hidden="true"></span>
          Record
        </AppButton>
        <AppButton
          :variant="isRecording ? 'recording-active' : 'default'"
          :disabled="!isRecording"
          @click="executeCommand(EAppCommand.StopRecording)"
        >
          Stop
        </AppButton>
        <AppButton
          v-if="!isReplaying"
          :disabled="!lastRecording || isRecording"
          @click="executeCommand(EAppCommand.StartReplay)"
        >
          Replay
        </AppButton>
        <AppButton v-else @click="executeCommand(EAppCommand.StopReplay)">
          Stop Replay
        </AppButton>
        <AppButton @click="executeCommand(EAppCommand.EnterCaptureMode)">
          Capture
        </AppButton>
      </div>

      <div class="studio__session">
        <template v-if="isRecording">
          <span>Capturing your rhythm</span>
          <span class="studio__session-note"
            >Words and pauses, as they happen</span
          >
        </template>
        <template v-else-if="lastRecording">
          <span>
            {{ lastRecording.events.length }} events /
            {{ (lastRecording.durationMs / 1000).toFixed(1) }}s
          </span>
          <span class="studio__session-note"
            >Kept in memory for this session</span
          >
        </template>
        <template v-else>
          <span>Your rhythm. Your pauses.</span>
          <span class="studio__session-note">Record begins a fresh take</span>
        </template>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.studio {
  /* Reserve room for chrome while keeping the stage's output ratio intact. */
  --app-workspace-width: min(
    960px,
    100%,
    calc(
      max(180px, 100dvh - var(--app-workspace-padding) * 2 - 180px) *
        (var(--capture-aspect-ratio))
    )
  );

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: 16px;

  width: 100%;
  height: 100%;
  padding: var(--app-workspace-padding);
  overflow: auto;
}

.studio__header,
.studio__heading,
.studio__footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: var(--app-workspace-width);
}

.studio__title {
  margin: 0;
  font-family: var(--app-title-font-family);
  font-size: 30px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -1px;
}

.studio__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--app-status-live);
  font-size: 12px;
  white-space: nowrap;
}

.studio__status--recording {
  color: var(--app-status-recording);
}

.studio__status--replaying {
  color: var(--app-status-replaying);
}

.studio__status-dot,
.studio__record-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.studio__heading {
  color: var(--app-text-secondary);
  font-size: 10px;
}

.studio__eyebrow {
  text-transform: uppercase;
  letter-spacing: 1.6px;
}

.studio__tagline {
  font-size: 11px;
}

.studio--capture {
  padding: 0;
  gap: 0;
}

.studio__stage {
  position: relative;
  flex-shrink: 0;
  width: var(--app-workspace-width);
  aspect-ratio: var(--capture-aspect-ratio);
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-panel);
  background: var(--app-preview-background);
  box-shadow: var(--app-preview-shadow);
}

.studio__stage:not(.studio__stage--capture):focus-within {
  border-color: var(--app-focus-color);
  box-shadow: var(--app-focus-ring), var(--app-preview-shadow);
}

.studio__stage--capture {
  width: 100%;
  max-width: none;
  height: 100%;
  aspect-ratio: auto;
  border: 0;
  border-radius: 0;
  background: var(--capture-chroma-color);
  box-shadow: none;
}

.studio__controls {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.studio__hint {
  flex-shrink: 0;
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 11px;
  line-height: 20px;
  text-align: center;
}

.studio__hint kbd {
  margin: 0 2px;
  padding: 2px 4px;
  border: 1px solid var(--app-border);
  border-radius: 4px;
  background: var(--app-surface);
  color: var(--app-text-primary);
  font: inherit;
}

.studio__footer {
  flex-wrap: wrap;
}

.studio__session {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: auto;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.studio__session-note {
  color: var(--app-text-secondary);
  font-size: 10px;
}

@media (max-width: 600px) {
  .studio__tagline {
    display: none;
  }

  .studio__footer {
    flex-direction: column;
  }

  .studio__controls {
    flex-shrink: 1;
    justify-content: center;
  }

  .studio__session {
    margin-left: 0;
    text-align: center;
  }
}
</style>

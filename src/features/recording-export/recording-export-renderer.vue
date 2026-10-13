<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { nextTick, onMounted, reactive } from 'vue';

import CaptionCanvas from '@/features/captions/caption-canvas.vue';
import { applyTypingSessionEvent } from '@/features/typing/apply-typing-session-event';

import type { TRecordingExportInput } from './recording-export.model';

const context = window as unknown as Window & {
  cicadaExportInput: TRecordingExportInput;
  cicadaExportClock: { advanceTo: (timestampMs: number) => Promise<void> };
};
const input = context.cicadaExportInput;
const session = reactive({ text: '', captions: [] as string[] });
let eventIndex = 0;
let animationUpdates = 0;

function observeAnimationUpdate() {
  animationUpdates++;
}

async function renderAt(elapsedMs: number) {
  while (
    eventIndex < input.recording.events.length &&
    input.recording.events[eventIndex].elapsedMs <= elapsedMs
  ) {
    const recorded = input.recording.events[eventIndex++];
    await context.cicadaExportClock.advanceTo(1100 + recorded.elapsedMs);
    applyTypingSessionEvent({ state: session, event: recorded.event });
    await nextTick();
  }
  await context.cicadaExportClock.advanceTo(1100 + elapsedMs);
  await nextTick();
}

onMounted(async () => {
  let error: string | null = null;
  let maxItems = 0;
  try {
    await document.fonts.ready;
    await nextTick();
    await context.cicadaExportClock.advanceTo(1100);
    for (let index = 0; index < input.frameCount; index++) {
      // Include the recording endpoint in the last frame, within one frame of
      // timing quantization, so a last-moment typing event is not lost.
      await renderAt(
        index === input.frameCount - 1
          ? input.recording.durationMs
          : (index * 1000) / 30,
      );
      maxItems = Math.max(maxItems, document.querySelectorAll('.item').length);
      await invoke('capture_recording_export_frame', { index });
    }
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }
  await invoke('finish_recording_export_render', {
    error,
    summary: {
      appliedEventCount: eventIndex,
      maxItems,
      finalItems: document.querySelectorAll('.item').length,
      documentVisibility: document.visibilityState,
      animationUpdates,
    },
  });
});
</script>

<template>
  <div class="recording-export-renderer">
    <CaptionCanvas
      :committed-captions="session.captions"
      :active-text="session.text"
      :layout="input.layout"
      :show-caret="true"
      :on-animation-update="observeAnimationUpdate"
    />
  </div>
</template>

<style scoped>
.recording-export-renderer {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #00ff00;
}
</style>

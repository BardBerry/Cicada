<script setup lang="ts">
import { useTemplateRef } from 'vue';
import TypingSurface from '../typing/typing-surface.vue';
import { useTypingSession } from './use-typing-session';

const typingSurface = useTemplateRef('typingSurface');

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

function handleStartRecording() {
  startRecording();
  typingSurface.value?.focus();
}
</script>

<template>
  <TypingSurface
    ref="typingSurface"
    :text="session.text"
    :disabled="isReplaying"
    @typing-event="handleLiveTypingEvent"
  />
  <button :disabled="isRecording || isReplaying" @click="handleStartRecording">
    Record
  </button>
  <button :disabled="!isRecording" @click="stopRecording">Stop</button>
  <button
    v-if="!isReplaying"
    :disabled="!lastRecording || isRecording"
    @click="startReplay"
  >
    Replay
  </button>
  <button v-else @click="stopReplay">Stop Replay</button>
  <div>
    <div
      v-for="(caption, index) in session.captions"
      :key="index"
      class="caption"
    >
      {{ caption }}
    </div>
  </div>
</template>

<style>
.caption {
  min-height: 20px;
  border: 1px solid #ccc;
}
</style>

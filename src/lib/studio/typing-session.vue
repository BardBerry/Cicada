<script setup lang="ts">
import { ref } from 'vue';
import TypingSurface from '../typing/typing-surface.vue';
import {
  ETypingEventType,
  type TTypingEvent,
} from '../typing/typing-event.model';
import { applyTextMutation } from '../typing/apply-text-mutation';
import { useTypingRecording } from '../recording/use-typing-recording';

const text = ref('');
const captions = ref<string[]>([]);

const { isRecording, startRecording, stopRecording, recordEvent } =
  useTypingRecording();

function handleStartRecording() {
  captions.value = [];
  text.value = '';
  startRecording();
}

function handleTypingEvent(event: TTypingEvent) {
  switch (event.type) {
    case ETypingEventType.Commit:
      captions.value.push(text.value);
      text.value = '';
      break;
    case ETypingEventType.Insert:
    case ETypingEventType.Delete:
      text.value = applyTextMutation({ text: text.value, event });
  }

  if (isRecording.value) {
    recordEvent(event);
  }
}
</script>

<template>
  <TypingSurface :text="text" @typing-event="handleTypingEvent" />
  <button v-if="!isRecording" @click="handleStartRecording">Record</button>
  <button v-else @click="stopRecording">Stop</button>
  <div>
    <div v-for="(caption, index) in captions" :key="index" class="caption">
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

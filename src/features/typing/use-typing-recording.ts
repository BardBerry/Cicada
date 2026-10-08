import { ref } from 'vue';

import { type TTypingEvent } from './typing-event.model';
import { createTypingRecorder, type TTypingRecorder } from './typing-recorder';

export function useTypingRecording() {
  const isRecording = ref(false);

  let recorder: TTypingRecorder | null = null;

  function startRecording() {
    if (recorder) return;

    recorder = createTypingRecorder();
    isRecording.value = true;
  }

  function recordEvent(event: TTypingEvent) {
    if (!recorder) {
      throw new Error('Cannot record event when recording is not active');
    }

    recorder.record(event);
  }

  function stopRecording() {
    if (!recorder) return null;

    const recording = recorder.stop();

    recorder = null;
    isRecording.value = false;

    return recording;
  }

  function cancelRecording() {
    recorder = null;
    isRecording.value = false;
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    recordEvent,
  };
}

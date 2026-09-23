import { ref } from 'vue';
import { createTypingRecorder, type TTypingRecorder } from './typing-recorder';
import { type TTypingEvent } from '../typing/typing-event.model';

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

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordEvent,
  };
}

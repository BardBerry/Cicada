import { onUnmounted, ref } from 'vue';
import type { TTypingRecording } from '../recording/typing-recording.model';
import type { TTypingEvent } from '../typing/typing-event.model';
import { createTypingReplay, type TTypingReplay } from './typing-replay';

type TStartReplayParams = {
  recording: TTypingRecording;
  onEvent: (event: TTypingEvent) => void;
};

export function useTypingReplay() {
  const isReplaying = ref(false);

  let replay: TTypingReplay | null = null;

  function startReplay({ recording, onEvent }: TStartReplayParams) {
    if (replay) stopReplay();

    replay = createTypingReplay({
      recording,
      onEvent,

      onFinish() {
        replay = null;
        isReplaying.value = false;
      },
    });

    isReplaying.value = true;
    replay.start();
  }

  function stopReplay() {
    if (!replay) return;

    replay.stop();
  }

  onUnmounted(() => {
    stopReplay();
  });

  return {
    isReplaying,
    startReplay,
    stopReplay,
  };
}

import { ref } from 'vue';

import type { TTypingEvent } from './typing-event.model';
import type { TTypingRecording } from './typing-recording.model';
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

  return {
    isReplaying,
    startReplay,
    stopReplay,
  };
}

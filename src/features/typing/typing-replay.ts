import type { TTypingEvent } from './typing-event.model';
import type { TTypingRecording } from './typing-recording.model';

type TCreateTypingReplayParams = {
  recording: TTypingRecording;
  onEvent: (event: TTypingEvent) => void;
  onFinish?: () => void;
};

enum ETypingReplayState {
  Idle = 'idle',
  Running = 'running',
  Finished = 'finished',
}

export type TTypingReplay = {
  start: () => void;
  stop: () => void;
};

export function createTypingReplay({
  recording,
  onEvent,
  onFinish,
}: TCreateTypingReplayParams): TTypingReplay {
  let state: ETypingReplayState = ETypingReplayState.Idle;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let eventIndex = 0;
  let startedAt = 0;

  function start() {
    if (state !== ETypingReplayState.Idle) return;

    state = ETypingReplayState.Running;
    startedAt = performance.now();

    processNextEvents();
  }

  function stop() {
    if (state !== ETypingReplayState.Running) return;

    finish();
  }

  function finish() {
    if (state === ETypingReplayState.Finished) return;

    state = ETypingReplayState.Finished;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    onFinish?.();
  }

  function processNextEvents() {
    if (state !== ETypingReplayState.Running) return;

    while (eventIndex < recording.events.length) {
      const recordedEvent = recording.events[eventIndex];

      const elapsedMs = performance.now() - startedAt;
      const remainingMs = recordedEvent.elapsedMs - elapsedMs;

      if (remainingMs > 0) {
        timeoutId = setTimeout(processNextEvents, remainingMs);
        return;
      }

      onEvent(recordedEvent.event);
      eventIndex++;

      if (state !== ETypingReplayState.Running) {
        return;
      }
    }

    const remainingMs = recording.durationMs - (performance.now() - startedAt);

    if (remainingMs > 0) {
      timeoutId = setTimeout(finish, remainingMs);
      return;
    }

    finish();
  }

  return {
    start,
    stop,
  };
}

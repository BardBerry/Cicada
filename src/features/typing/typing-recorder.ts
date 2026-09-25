import { type TTypingEvent } from './typing-event.model';
import {
  type TRecordedTypingEvent,
  type TTypingRecording,
} from './typing-recording.model';

export type TTypingRecorder = {
  record: (event: TTypingEvent) => void;
  stop: () => TTypingRecording;
};

export function createTypingRecorder(): TTypingRecorder {
  const startedAt = performance.now();
  const events: TRecordedTypingEvent[] = [];

  let isFinished = false;

  function record(event: TTypingEvent) {
    if (isFinished) {
      throw new Error('Cannot record event after recording has finished');
    }

    events.push({
      elapsedMs: performance.now() - startedAt,
      event,
    });
  }

  function stop(): TTypingRecording {
    if (isFinished) {
      throw new Error('Recording has already finished');
    }

    isFinished = true;

    return {
      events: [...events],
      durationMs: performance.now() - startedAt,
    };
  }

  return {
    record,
    stop,
  };
}

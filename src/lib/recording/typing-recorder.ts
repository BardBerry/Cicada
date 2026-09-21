import { type TTypingEvent } from '../typing/typing-event.model';
import {
  type TTypingRecording,
  type TRecordedTypingEvent,
} from './typing-recording.model';

export type TPerformanceRecorder = ReturnType<typeof createTypingRecorder>;

export function createTypingRecorder() {
  const startedAt = performance.now();
  const events: TRecordedTypingEvent[] = [];

  return {
    record(event: TTypingEvent) {
      events.push({
        elapsedMs: performance.now() - startedAt,
        event,
      });
    },

    stop(): TTypingRecording {
      return {
        events,
        durationMs: performance.now() - startedAt,
      };
    },
  };
}

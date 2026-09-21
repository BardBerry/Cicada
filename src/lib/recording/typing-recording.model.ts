import { type TTypingEvent } from '../typing/typing-event.model';

export type TRecordedTypingEvent = {
  elapsedMs: number;
  event: TTypingEvent;
};

export type TTypingRecording = {
  events: TRecordedTypingEvent[];
  durationMs: number;
};

import { ETypingEventType } from '../typing/typing-event.model';
import type { TRecording, TRecordingSummary } from './project.model';

type TRecordingSummariesMatchParams = {
  existing: TRecordingSummary;
  expected: TRecordingSummary;
};

type TAssertRecordingMatchesSummaryParams = {
  summary: TRecordingSummary;
  recording: TRecording;
};

type TRecordingsMatchParams = {
  existing: TRecording;
  expected: TRecording;
};

export function recordingSummariesMatch({
  existing,
  expected,
}: TRecordingSummariesMatchParams): boolean {
  return (
    existing.id === expected.id &&
    existing.name === expected.name &&
    existing.createdAt === expected.createdAt &&
    existing.durationMs === expected.durationMs &&
    existing.eventCount === expected.eventCount
  );
}

export function assertRecordingMatchesSummary({
  summary,
  recording,
}: TAssertRecordingMatchesSummaryParams): void {
  if (
    recording.id !== summary.id ||
    recording.createdAt !== summary.createdAt ||
    recording.recording.durationMs !== summary.durationMs ||
    recording.recording.events.length !== summary.eventCount
  ) {
    throw new Error('Recording file does not match its project summary');
  }
}

export function recordingsMatch({
  existing,
  expected,
}: TRecordingsMatchParams): boolean {
  if (
    existing.id !== expected.id ||
    existing.createdAt !== expected.createdAt ||
    existing.recording.durationMs !== expected.recording.durationMs ||
    existing.recording.events.length !== expected.recording.events.length
  ) {
    return false;
  }

  return existing.recording.events.every((existingEvent, index) => {
    const expectedEvent = expected.recording.events[index];

    if (
      existingEvent.elapsedMs !== expectedEvent.elapsedMs ||
      existingEvent.event.type !== expectedEvent.event.type
    ) {
      return false;
    }

    switch (existingEvent.event.type) {
      case ETypingEventType.Insert:
        return (
          expectedEvent.event.type === ETypingEventType.Insert &&
          existingEvent.event.text === expectedEvent.event.text
        );

      case ETypingEventType.Delete:
        return (
          expectedEvent.event.type === ETypingEventType.Delete &&
          existingEvent.event.count === expectedEvent.event.count
        );

      case ETypingEventType.Commit:
        return true;
    }
  });
}

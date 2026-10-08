import { deriveRecordingPreview } from './derive-recording-preview';
import type { TRecordingPayload, TRecordingSummary } from './recording.model';

type TRecordingSummariesMatchParams = {
  existing: TRecordingSummary;
  expected: TRecordingSummary;
};

type TAssertRecordingMatchesSummaryParams = {
  summary: TRecordingSummary;
  recording: TRecordingPayload;
};

export function recordingSummariesMatch({
  existing,
  expected,
}: TRecordingSummariesMatchParams): boolean {
  return (
    existing.id === expected.id &&
    existing.createdAt === expected.createdAt &&
    existing.name === expected.name &&
    existing.preview === expected.preview &&
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
    recording.recording.events.length !== summary.eventCount ||
    deriveRecordingPreview(recording.recording) !== summary.preview
  ) {
    throw new Error('Recording file does not match its catalog summary');
  }
}

export function compareRecordingSummaries(
  a: TRecordingSummary,
  b: TRecordingSummary,
): number {
  return (
    Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

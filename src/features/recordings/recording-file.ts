import { z } from 'zod';

import { ETypingEventType } from '@/features/typing/typing-event.model';

import type { TRecordingPayload, TRecordingSummary } from './recording.model';

const idSchema = z.uuid();
const timestampSchema = z.iso.datetime();
const elapsedMsSchema = z.number().nonnegative();

const typingEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal(ETypingEventType.Insert),
    text: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal(ETypingEventType.Delete),
    count: z.number().int().positive(),
  }),
  z.strictObject({ type: z.literal(ETypingEventType.Commit) }),
]);

const recordingSummarySchema = z.strictObject({
  id: idSchema,
  createdAt: timestampSchema,
  name: z
    .string()
    .min(1)
    .refine((name) => name === name.trim())
    .nullable(),
  preview: z.string().refine((preview) => Array.from(preview).length <= 120),
  durationMs: elapsedMsSchema,
  eventCount: z.number().int().nonnegative(),
});

const catalogFileV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    recordings: z.array(recordingSummarySchema),
  })
  .check((ctx) => {
    const ids = new Set<string>();

    ctx.value.recordings.forEach((recording, index) => {
      if (ids.has(recording.id)) {
        ctx.issues.push({
          code: 'custom',
          message: 'Recording IDs must be unique',
          input: recording.id,
          path: ['recordings', index, 'id'],
        });
      }

      ids.add(recording.id);
    });
  });

const recordingFileV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: idSchema,
    createdAt: timestampSchema,
    durationMs: elapsedMsSchema,
    events: z.array(
      z.strictObject({ elapsedMs: elapsedMsSchema, event: typingEventSchema }),
    ),
  })
  .check((ctx) => {
    let previousElapsedMs = 0;

    ctx.value.events.forEach((recordedEvent, index) => {
      if (recordedEvent.elapsedMs < previousElapsedMs) {
        ctx.issues.push({
          code: 'custom',
          message: 'Recording events must be chronological',
          input: recordedEvent.elapsedMs,
          path: ['events', index, 'elapsedMs'],
        });
      }

      if (recordedEvent.elapsedMs > ctx.value.durationMs) {
        ctx.issues.push({
          code: 'custom',
          message: 'Recording events cannot exceed the recording duration',
          input: recordedEvent.elapsedMs,
          path: ['events', index, 'elapsedMs'],
        });
      }

      previousElapsedMs = recordedEvent.elapsedMs;
    });
  });

type TParseRecordingFileParams = {
  contents: string;
  expectedId: string;
};

export function assertRecordingId(id: string): void {
  idSchema.parse(id);
}

export function serializeRecordingCatalog(
  recordings: TRecordingSummary[],
): string {
  const file = catalogFileV1Schema.parse({ schemaVersion: 1, recordings });
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function parseRecordingCatalog(contents: string): TRecordingSummary[] {
  const input: unknown = JSON.parse(contents);
  return catalogFileV1Schema.parse(input).recordings;
}

export function serializeRecordingFile({
  id,
  createdAt,
  recording,
}: TRecordingPayload): string {
  const file = recordingFileV1Schema.parse({
    schemaVersion: 1,
    id,
    createdAt,
    durationMs: recording.durationMs,
    events: recording.events,
  });

  return `${JSON.stringify(file, null, 2)}\n`;
}

export function parseRecordingFile({
  contents,
  expectedId,
}: TParseRecordingFileParams): TRecordingPayload {
  assertRecordingId(expectedId);
  const input: unknown = JSON.parse(contents);
  const file = recordingFileV1Schema.parse(input);

  if (file.id !== expectedId) {
    throw new Error(
      `Recording file ID ${file.id} does not match catalog ID ${expectedId}`,
    );
  }

  return {
    id: file.id,
    createdAt: file.createdAt,
    recording: { durationMs: file.durationMs, events: file.events },
  };
}

import { z } from 'zod';

import { ETypingEventType } from '@/features/typing/typing-event.model';
import type { TRecordedTypingEvent } from '@/features/typing/typing-recording.model';

import type { TProject, TRecording } from './project.model';

const PROJECT_SCHEMA_VERSION = 1;
const RECORDING_SCHEMA_VERSION = 1;

const idSchema = z.uuid();
const timestampSchema = z.iso.datetime();
const elapsedMsSchema = z.number().nonnegative();

const insertEventSchema = z.strictObject({
  type: z.literal(ETypingEventType.Insert),
  text: z.string().min(1),
});

const deleteEventSchema = z.strictObject({
  type: z.literal(ETypingEventType.Delete),
  count: z.number().int().positive(),
});

const commitEventSchema = z.strictObject({
  type: z.literal(ETypingEventType.Commit),
});

const typingEventSchema = z.discriminatedUnion('type', [
  insertEventSchema,
  deleteEventSchema,
  commitEventSchema,
]);

const recordedTypingEventSchema = z.strictObject({
  elapsedMs: elapsedMsSchema,
  event: typingEventSchema,
});

const recordingSummarySchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  createdAt: timestampSchema,
  durationMs: elapsedMsSchema,
  eventCount: z.number().int().nonnegative(),
});

const projectFileV1Schema = z
  .strictObject({
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    id: idSchema,
    name: z.string().min(1),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    recordings: z.array(recordingSummarySchema),
  })
  .check((ctx) => {
    const recordingIds = new Set<string>();

    ctx.value.recordings.forEach((recording, index) => {
      if (recordingIds.has(recording.id)) {
        ctx.issues.push({
          code: 'custom',
          message: 'Recording IDs must be unique',
          input: recording.id,
          path: ['recordings', index, 'id'],
        });
      }

      recordingIds.add(recording.id);
    });
  });

const recordingFileV1Schema = z
  .strictObject({
    schemaVersion: z.literal(RECORDING_SCHEMA_VERSION),
    id: idSchema,
    createdAt: timestampSchema,
    durationMs: elapsedMsSchema,
    events: z.array(recordedTypingEventSchema),
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

type TParseRecordingParams = {
  contents: string;
  expectedId: string;
};

export function assertProjectId(id: string) {
  idSchema.parse(id);
}

export function assertRecordingId(id: string) {
  idSchema.parse(id);
}

export function serializeProjectFile(project: TProject): string {
  const file = projectFileV1Schema.parse({
    ...project,
    schemaVersion: PROJECT_SCHEMA_VERSION,
  });

  return `${JSON.stringify(file, null, 2)}\n`;
}

export function parseProjectFile(contents: string): TProject {
  const input: unknown = JSON.parse(contents);
  const file = projectFileV1Schema.parse(input);

  return {
    id: file.id,
    name: file.name,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    recordings: file.recordings.map((recording) => ({ ...recording })),
  };
}

export function serializeRecordingFile({
  id,
  createdAt,
  recording,
}: TRecording): string {
  const file = recordingFileV1Schema.parse({
    schemaVersion: RECORDING_SCHEMA_VERSION,
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
}: TParseRecordingParams): TRecording {
  assertRecordingId(expectedId);

  const input: unknown = JSON.parse(contents);
  const file = recordingFileV1Schema.parse(input);

  if (file.id !== expectedId) {
    throw new Error(
      `Recording file ID ${file.id} does not match manifest ID ${expectedId}`,
    );
  }

  return {
    id: file.id,
    createdAt: file.createdAt,
    recording: {
      durationMs: file.durationMs,
      events: file.events.map(toRecordedTypingEvent),
    },
  };
}

function toRecordedTypingEvent(
  recordedEvent: z.infer<typeof recordedTypingEventSchema>,
): TRecordedTypingEvent {
  return {
    elapsedMs: recordedEvent.elapsedMs,
    event: { ...recordedEvent.event },
  };
}

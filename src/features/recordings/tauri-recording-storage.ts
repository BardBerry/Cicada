import { BaseDirectory } from '@tauri-apps/api/path';
import {
  exists,
  type FileHandle,
  mkdir,
  open,
  readTextFile,
  remove,
  rename,
} from '@tauri-apps/plugin-fs';

import { deriveRecordingPreview } from './derive-recording-preview';
import type { TRecordingSummary } from './recording.model';
import {
  assertRecordingMatchesSummary,
  compareRecordingSummaries,
  recordingSummariesMatch,
} from './recording-consistency';
import {
  assertRecordingId,
  parseRecordingCatalog,
  parseRecordingFile,
  serializeRecordingCatalog,
  serializeRecordingFile,
} from './recording-file';
import type { TRecordingStorage } from './recording-storage';

const RECORDINGS_DIRECTORY = 'recordings';
const CATALOG_FILE = `${RECORDINGS_DIRECTORY}/catalog.json`;
const APP_DATA_OPTIONS = { baseDir: BaseDirectory.AppData } as const;

export const tauriRecordingStorage: TRecordingStorage = {
  async listRecordings() {
    return (await readCatalog()).sort(compareRecordingSummaries);
  },

  async loadRecording(id) {
    assertRecordingId(id);
    const catalog = await readCatalog();
    const summary = catalog.find((item) => item.id === id);

    if (!summary)
      throw new Error(`Recording ${id} was not found in the catalog`);

    const recording = parseRecordingFile({
      contents: await readTextFile(
        `${RECORDINGS_DIRECTORY}/${id}.json`,
        APP_DATA_OPTIONS,
      ),
      expectedId: id,
    });
    assertRecordingMatchesSummary({ summary, recording });

    return { summary, recording: recording.recording };
  },

  async saveRecording(params) {
    // Validate and detach every caller-owned value before the first await.
    const contents = serializeRecordingFile(params);
    const payload = parseRecordingFile({ contents, expectedId: params.id });
    const summary: TRecordingSummary = {
      id: payload.id,
      createdAt: payload.createdAt,
      name: params.name?.trim() || null,
      preview: deriveRecordingPreview(payload.recording),
      durationMs: payload.recording.durationMs,
      eventCount: payload.recording.events.length,
    };
    // Validate the derived summary before performing filesystem work.
    serializeRecordingCatalog([summary]);

    const catalog = await readCatalog();
    const existing = catalog.find((item) => item.id === payload.id);
    const path = `${RECORDINGS_DIRECTORY}/${payload.id}.json`;

    if (existing) {
      if (!recordingSummariesMatch({ existing, expected: summary })) {
        throw new Error('An existing recording conflicts with this save');
      }

      await assertPayloadFileMatches({ path, id: payload.id, contents });
      return existing;
    }

    await mkdir(RECORDINGS_DIRECTORY, { ...APP_DATA_OPTIONS, recursive: true });
    let file: FileHandle | null = null;

    try {
      file = await open(path, {
        ...APP_DATA_OPTIONS,
        write: true,
        createNew: true,
      });
    } catch (error) {
      // A failed exclusive create may be an idempotent retry after a previous
      // payload write succeeded but catalog publication did not.
      // Continue only if the existing file exactly matches the intended payload.
      // The failed open never grants cleanup ownership of the path.
      try {
        await assertPayloadFileMatches({ path, id: payload.id, contents });
      } catch {
        throw error;
      }
    }

    if (file) {
      try {
        await writeAll({ file, contents });
      } catch (error) {
        await file.close().catch(() => {});
        await remove(path, APP_DATA_OPTIONS).catch(() => {});
        throw error;
      }

      // Complete data survives a close failure so the same save can be retried.
      await file.close();
    }

    await publishCatalog([...catalog, summary]);
    return summary;
  },

  async deleteRecording(id) {
    assertRecordingId(id);
    const catalog = await readCatalog();

    if (!catalog.some((item) => item.id === id)) {
      throw new Error(`Recording ${id} was not found in the catalog`);
    }

    await publishCatalog(catalog.filter((item) => item.id !== id));

    const path = `${RECORDINGS_DIRECTORY}/${id}.json`;

    try {
      await remove(path, APP_DATA_OPTIONS);
      return { cleanupWarning: null };
    } catch (error) {
      if (!(await exists(path, APP_DATA_OPTIONS))) {
        return { cleanupWarning: null };
      }

      const message = error instanceof Error ? error.message : String(error);

      return {
        cleanupWarning: `Recording was removed from the catalog, but its file could not be deleted: ${message}`,
      };
    }
  },
};

async function readCatalog(): Promise<TRecordingSummary[]> {
  if (!(await exists(CATALOG_FILE, APP_DATA_OPTIONS))) return [];

  return parseRecordingCatalog(
    await readTextFile(CATALOG_FILE, APP_DATA_OPTIONS),
  );
}

async function publishCatalog(recordings: TRecordingSummary[]): Promise<void> {
  const contents = serializeRecordingCatalog(recordings);
  const path = `${RECORDINGS_DIRECTORY}/catalog-${crypto.randomUUID()}.tmp`;
  let file: FileHandle | null = null;

  try {
    file = await open(path, {
      ...APP_DATA_OPTIONS,
      write: true,
      createNew: true,
    });
    await writeAll({ file, contents });
    await file.close();
    file = null;
  } catch (error) {
    if (file) {
      await file.close().catch(() => {});
      await remove(path, APP_DATA_OPTIONS).catch(() => {});
    }

    throw error;
  }

  try {
    await rename(path, CATALOG_FILE, {
      oldPathBaseDir: BaseDirectory.AppData,
      newPathBaseDir: BaseDirectory.AppData,
    });
  } catch (error) {
    await remove(path, APP_DATA_OPTIONS).catch(() => {});
    throw error;
  }
}

type TWriteAllParams = { file: FileHandle; contents: string };

async function writeAll({ file, contents }: TWriteAllParams): Promise<void> {
  const bytes = new TextEncoder().encode(contents);
  let offset = 0;

  while (offset < bytes.length) {
    const written = await file.write(bytes.subarray(offset));
    if (written <= 0) throw new Error('File write made no progress');
    offset += written;
  }
}

type TAssertPayloadFileMatchesParams = {
  path: string;
  id: string;
  contents: string;
};

async function assertPayloadFileMatches({
  path,
  id,
  contents,
}: TAssertPayloadFileMatchesParams): Promise<void> {
  const existing = parseRecordingFile({
    contents: await readTextFile(path, APP_DATA_OPTIONS),
    expectedId: id,
  });

  if (serializeRecordingFile(existing) !== contents) {
    throw new Error(`Recording ${id} already exists with different data`);
  }
}

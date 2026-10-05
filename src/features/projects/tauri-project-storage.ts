import { BaseDirectory, join } from '@tauri-apps/api/path';
import {
  exists,
  type FileHandle,
  mkdir,
  open,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from '@tauri-apps/plugin-fs';

import {
  assertProjectId,
  assertRecordingId,
  parseProjectFile,
  parseRecordingFile,
  serializeProjectFile,
  serializeRecordingFile,
} from './project-file';
import { assertRecordingMatchesSummary } from './project-recording';
import type { TProjectStorage } from './project-storage';

const PROJECTS_DIRECTORY_NAME = 'projects';
const PROJECT_FILE_NAME = 'project.json';
const RECORDINGS_DIRECTORY_NAME = 'recordings';
const APP_DATA_OPTIONS = { baseDir: BaseDirectory.AppData } as const;

export const tauriProjectStorage: TProjectStorage = {
  async createProject(project) {
    const projectFileContents = serializeProjectFile(project);
    const projectDirectory = await getProjectDirectory(project.id);
    const recordingsDirectory = await getRecordingsDirectory(project.id);
    const projectFile = await getProjectFile(project.id);

    await ensureProjectsDirectory();

    if (await exists(projectDirectory, APP_DATA_OPTIONS)) {
      throw new Error(`Project ${project.id} already exists`);
    }

    let projectDirectoryCreated = false;

    try {
      await mkdir(projectDirectory, APP_DATA_OPTIONS);
      projectDirectoryCreated = true;
      await mkdir(recordingsDirectory, APP_DATA_OPTIONS);
      await writeTextFile(projectFile, projectFileContents, APP_DATA_OPTIONS);
    } catch (error) {
      if (!projectDirectoryCreated) throw error;

      try {
        await remove(projectDirectory, {
          ...APP_DATA_OPTIONS,
          recursive: true,
        });
      } catch {
        // add later cleanup/error-reporting improvement, so we do not discard the cleanup error
        throw error;
      }

      throw error;
    }
  },

  async listProjects() {
    await ensureProjectsDirectory();

    const entries = await readDir(PROJECTS_DIRECTORY_NAME, APP_DATA_OPTIONS);
    const projects = [];

    for (const entry of entries) {
      if (!entry.isDirectory) continue;

      try {
        assertProjectId(entry.name);
      } catch {
        continue;
      }

      projects.push(await loadProject(entry.name));
    }

    return projects;
  },

  loadProject,

  async saveProject(nextProject) {
    const contents = serializeProjectFile(nextProject);
    const projectFile = await getProjectFile(nextProject.id);

    await writeTextFile(projectFile, contents, APP_DATA_OPTIONS);
  },

  async saveRecording({ nextProject, recording }) {
    const recordingSummary = nextProject.recordings.find(
      (candidate) => candidate.id === recording.id,
    );

    if (!recordingSummary) {
      throw new Error(`Project does not reference recording ${recording.id}`);
    }

    assertRecordingMatchesSummary({ summary: recordingSummary, recording });

    const recordingFile = await getRecordingFile({
      projectId: nextProject.id,
      recordingId: recording.id,
    });
    const projectFile = await getProjectFile(nextProject.id);
    const recordingFileContents = serializeRecordingFile(recording);
    const projectFileContents = serializeProjectFile(nextProject);

    if (await exists(recordingFile, APP_DATA_OPTIONS)) {
      await assertRecordingFileMatches({
        recordingFile,
        recordingId: recording.id,
        expectedContents: recordingFileContents,
      });
    } else {
      let file: FileHandle | null = null;

      try {
        file = await open(recordingFile, {
          ...APP_DATA_OPTIONS,
          write: true,
          createNew: true,
        });
      } catch (error) {
        // An unsuccessful open never grants ownership of an existing file.
        try {
          await assertRecordingFileMatches({
            recordingFile,
            recordingId: recording.id,
            expectedContents: recordingFileContents,
          });
        } catch {
          throw error;
        }
      }

      if (file) {
        try {
          const bytes = new TextEncoder().encode(recordingFileContents);
          let offset = 0;

          while (offset < bytes.length) {
            const written = await file.write(bytes.subarray(offset));

            if (written === 0) {
              throw new Error('Recording file write made no progress');
            }

            offset += written;
          }
        } catch (error) {
          // Only a successful exclusive open permits partial-file cleanup.
          await file.close().catch(() => {});
          await remove(recordingFile, APP_DATA_OPTIONS).catch(() => {});
          throw error;
        }

        // A close failure leaves complete data for an idempotent retry.
        await file.close();
      }
    }

    await writeTextFile(projectFile, projectFileContents, APP_DATA_OPTIONS);
  },

  async loadRecording({ projectId, recordingId }) {
    const recordingFile = await getRecordingFile({ projectId, recordingId });
    const contents = await readTextFile(recordingFile, APP_DATA_OPTIONS);

    return parseRecordingFile({ contents, expectedId: recordingId });
  },

  async deleteRecording({ nextProject, recordingId }) {
    assertRecordingId(recordingId);

    if (nextProject.recordings.some((item) => item.id === recordingId)) {
      throw new Error(`Project still references recording ${recordingId}`);
    }

    const projectFile = await getProjectFile(nextProject.id);
    const recordingFile = await getRecordingFile({
      projectId: nextProject.id,
      recordingId,
    });
    const contents = serializeProjectFile(nextProject);

    await writeTextFile(projectFile, contents, APP_DATA_OPTIONS);

    try {
      await remove(recordingFile, APP_DATA_OPTIONS);
      return { cleanupWarning: null };
    } catch (error) {
      // The plugin exposes strings, not reliable NotFound error codes.
      return {
        cleanupWarning: `Recording was removed from the project, but its file could not be deleted: ${getErrorMessage(error)}`,
      };
    }
  },
};

async function loadProject(projectId: string) {
  assertProjectId(projectId);

  const projectFile = await getProjectFile(projectId);
  const contents = await readTextFile(projectFile, APP_DATA_OPTIONS);
  const project = parseProjectFile(contents);

  if (project.id !== projectId) {
    throw new Error(
      `Project file ID ${project.id} does not match directory ID ${projectId}`,
    );
  }

  return project;
}

async function ensureProjectsDirectory() {
  await mkdir(PROJECTS_DIRECTORY_NAME, {
    ...APP_DATA_OPTIONS,
    recursive: true,
  });
}

async function getProjectDirectory(projectId: string) {
  assertProjectId(projectId);
  return join(PROJECTS_DIRECTORY_NAME, projectId);
}

async function getProjectFile(projectId: string) {
  return join(await getProjectDirectory(projectId), PROJECT_FILE_NAME);
}

async function getRecordingsDirectory(projectId: string) {
  return join(await getProjectDirectory(projectId), RECORDINGS_DIRECTORY_NAME);
}

type TGetRecordingFileParams = {
  projectId: string;
  recordingId: string;
};

type TAssertRecordingFileMatchesParams = {
  recordingFile: string;
  recordingId: string;
  expectedContents: string;
};

async function assertRecordingFileMatches({
  recordingFile,
  recordingId,
  expectedContents,
}: TAssertRecordingFileMatchesParams) {
  const existingContents = await readTextFile(recordingFile, APP_DATA_OPTIONS);
  const existingRecording = parseRecordingFile({
    contents: existingContents,
    expectedId: recordingId,
  });

  if (serializeRecordingFile(existingRecording) !== expectedContents) {
    throw new Error(
      `Recording ${recordingId} already exists with different data`,
    );
  }
}

async function getRecordingFile({
  projectId,
  recordingId,
}: TGetRecordingFileParams) {
  assertRecordingId(recordingId);

  return join(await getRecordingsDirectory(projectId), `${recordingId}.json`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

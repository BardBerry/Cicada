import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { TTypingRecording } from '@/features/typing/typing-recording.model';

import type { TProject, TRecording, TRecordingSummary } from './project.model';
import {
  assertRecordingMatchesSummary,
  recordingsMatch,
  recordingSummariesMatch,
} from './project-recording';
import { tauriProjectStorage } from './tauri-project-storage';

type TLoadProjectRecordingParams = {
  projectId: string;
  recordingId: string;
};

type TSaveRecordingToProjectParams = {
  projectId: string;
  recordingId: string;
  name: string;
  createdAt: string;
  recording: TTypingRecording;
};

type TRenameRecordingParams = {
  projectId: string;
  recordingId: string;
  name: string;
};

type TDeleteRecordingParams = {
  projectId: string;
  recordingId: string;
};

type TLoadedProjectRecording = {
  summary: TRecordingSummary;
  recording: TTypingRecording;
};

export const useProjectStore = defineStore('project', () => {
  const projects = ref<TProject[]>([]);
  const isBusy = ref(false);
  const errorMessage = ref<string | null>(null);
  const warningMessage = ref<string | null>(null);

  async function listProjects(): Promise<TProject[] | null> {
    if (isBusy.value) {
      errorMessage.value = 'Another project operation is already in progress';
      return null;
    }

    clearMessages();
    isBusy.value = true;

    try {
      const loadedProjects = await tauriProjectStorage.listProjects();
      projects.value = loadedProjects;
      return loadedProjects;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to list projects', error);
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function createProject(name: string): Promise<TProject | null> {
    if (isBusy.value) {
      errorMessage.value = 'Another project operation is already in progress';
      return null;
    }

    clearMessages();
    isBusy.value = true;

    try {
      const normalizedName = name.trim();

      if (!normalizedName) {
        errorMessage.value = 'Enter a project name';
        return null;
      }

      const now = new Date().toISOString();
      const project: TProject = {
        id: crypto.randomUUID(),
        name: normalizedName,
        createdAt: now,
        updatedAt: now,
        recordings: [],
      };

      await tauriProjectStorage.createProject(project);
      upsertProject(project);
      return project;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to create project', error);
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function loadProject(projectId: string): Promise<TProject | null> {
    if (isBusy.value) {
      errorMessage.value = 'Another project operation is already in progress';
      return null;
    }

    clearMessages();
    isBusy.value = true;

    try {
      const project = await tauriProjectStorage.loadProject(projectId);
      upsertProject(project);
      return project;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to load project', error);
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function loadProjectRecording({
    projectId,
    recordingId,
  }: TLoadProjectRecordingParams): Promise<TLoadedProjectRecording | null> {
    if (isBusy.value) {
      errorMessage.value = 'Another project operation is already in progress';
      return null;
    }

    clearMessages();
    isBusy.value = true;

    try {
      const project = await tauriProjectStorage.loadProject(projectId);
      const summary = project.recordings.find(
        (recording) => recording.id === recordingId,
      );

      if (!summary) {
        errorMessage.value = 'Recording was not found in the specified project';
        return null;
      }

      const recording = await tauriProjectStorage.loadRecording({
        projectId,
        recordingId,
      });

      assertRecordingMatchesSummary({ summary, recording });
      upsertProject(project);

      return { summary, recording: recording.recording };
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to load recording', error);
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function saveRecordingToProject(
    params: TSaveRecordingToProjectParams,
  ): Promise<TRecordingSummary | null> {
    if (isBusy.value) {
      errorMessage.value = 'Another project operation is already in progress';
      return null;
    }

    clearMessages();
    isBusy.value = true;

    try {
      const { projectId, recordingId, name, createdAt, recording } = params;
      const normalizedName = name.trim();

      if (!normalizedName) {
        errorMessage.value = 'Recording name cannot be empty';
        return null;
      }

      const project = await tauriProjectStorage.loadProject(projectId);
      const summary: TRecordingSummary = {
        id: recordingId,
        name: normalizedName,
        createdAt,
        durationMs: recording.durationMs,
        eventCount: recording.events.length,
      };
      const projectRecording: TRecording = {
        id: recordingId,
        createdAt,
        recording,
      };
      const existingSummary = project.recordings.find(
        (item) => item.id === recordingId,
      );

      if (existingSummary) {
        if (
          !recordingSummariesMatch({
            existing: existingSummary,
            expected: summary,
          })
        ) {
          throw new Error('An existing recording conflicts with this save');
        }

        const existingRecording = await tauriProjectStorage.loadRecording({
          projectId,
          recordingId,
        });

        if (
          !recordingsMatch({
            existing: existingRecording,
            expected: projectRecording,
          })
        ) {
          throw new Error('Existing recording file conflicts with this save');
        }

        upsertProject(project);
        return existingSummary;
      }

      const nextProject: TProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        recordings: [...project.recordings, summary],
      };

      await tauriProjectStorage.saveRecording({
        nextProject,
        recording: projectRecording,
      });

      upsertProject(nextProject);
      return summary;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to save recording', error);
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function renameRecording({
    projectId,
    recordingId,
    name,
  }: TRenameRecordingParams): Promise<boolean> {
    if (isBusy.value) {
      errorMessage.value = 'Another project operation is already in progress';
      return false;
    }

    clearMessages();
    isBusy.value = true;

    try {
      const normalizedName = name.trim();

      if (!normalizedName) {
        errorMessage.value = 'Recording name cannot be empty';
        return false;
      }

      const project = await tauriProjectStorage.loadProject(projectId);
      const recordingIndex = project.recordings.findIndex(
        (recording) => recording.id === recordingId,
      );

      if (recordingIndex === -1) {
        errorMessage.value = 'Recording was not found in the specified project';
        return false;
      }

      const nextProject: TProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        recordings: project.recordings.map((recording, index) =>
          index === recordingIndex
            ? { ...recording, name: normalizedName }
            : recording,
        ),
      };

      await tauriProjectStorage.saveProject(nextProject);
      upsertProject(nextProject);
      return true;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to rename recording', error);
      return false;
    } finally {
      isBusy.value = false;
    }
  }

  async function deleteRecording({
    projectId,
    recordingId,
  }: TDeleteRecordingParams): Promise<boolean> {
    if (isBusy.value) {
      errorMessage.value = 'Another project operation is already in progress';
      return false;
    }

    clearMessages();
    isBusy.value = true;

    try {
      const project = await tauriProjectStorage.loadProject(projectId);

      if (!project.recordings.some((item) => item.id === recordingId)) {
        errorMessage.value = 'Recording was not found in the specified project';
        return false;
      }

      const nextProject: TProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        recordings: project.recordings.filter(
          (recording) => recording.id !== recordingId,
        ),
      };
      const result = await tauriProjectStorage.deleteRecording({
        nextProject,
        recordingId,
      });

      upsertProject(nextProject);
      warningMessage.value = result.cleanupWarning;
      return true;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to delete recording', error);
      return false;
    } finally {
      isBusy.value = false;
    }
  }

  function upsertProject(project: TProject): void {
    const index = projects.value.findIndex((item) => item.id === project.id);

    if (index === -1) {
      projects.value.push(project);
    } else {
      projects.value[index] = project;
    }
  }

  function clearMessages(): void {
    errorMessage.value = null;
    warningMessage.value = null;
  }

  return {
    projects,
    isBusy,
    errorMessage,
    warningMessage,
    listProjects,
    createProject,
    loadProject,
    loadProjectRecording,
    saveRecordingToProject,
    renameRecording,
    deleteRecording,
    clearMessages,
  };
});

function getErrorMessage(context: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${context}: ${message}`;
}

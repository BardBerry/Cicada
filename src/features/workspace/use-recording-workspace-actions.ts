import { ref } from 'vue';

import { useProjectStore } from '@/features/projects/use-project-store';

import { useRecordingWorkspaceStore } from './use-recording-workspace-store';
import type { TWorkspaceSaveAttempt } from './workspace-recording.model';

type TOpenProjectRecordingParams = {
  projectId: string;
  recordingId: string;
  replaceUnsavedRecordingId?: string;
};

type TSaveWorkspaceRecordingParams = {
  projectId: string;
  name: string;
};

export function useRecordingWorkspaceActions() {
  const isBusy = ref(false);

  const projectStore = useProjectStore();
  const workspaceStore = useRecordingWorkspaceStore();

  async function openProjectRecording({
    projectId,
    recordingId,
    replaceUnsavedRecordingId,
  }: TOpenProjectRecordingParams): Promise<boolean> {
    if (isBusy.value || projectStore.isBusy) return false;

    const current = workspaceStore.workspaceRecording;

    if (workspaceStore.saveAttempt) return false;
    if (
      current?.hasUnsavedChanges &&
      current.id !== replaceUnsavedRecordingId
    ) {
      return false;
    }

    const expectedRecordingId = current?.id ?? null;
    isBusy.value = true;

    try {
      const loaded = await projectStore.loadProjectRecording({
        projectId,
        recordingId,
      });

      if (!loaded) return false;

      return workspaceStore.replaceRecording({
        expectedRecordingId,
        nextRecording: {
          id: loaded.summary.id,
          createdAt: loaded.summary.createdAt,
          recording: loaded.recording,
          projectId,
          hasUnsavedChanges: false,
        },
      });
    } finally {
      isBusy.value = false;
    }
  }

  async function saveWorkspaceRecording({
    projectId,
    name,
  }: TSaveWorkspaceRecordingParams): Promise<boolean> {
    if (isBusy.value || projectStore.isBusy) return false;

    const current = workspaceStore.workspaceRecording;
    const normalizedName = name.trim();

    // Saving edits to an existing project recording is not supported yet.
    if (
      !current ||
      current.projectId !== null ||
      !current.hasUnsavedChanges ||
      workspaceStore.saveAttempt ||
      !normalizedName
    ) {
      return false;
    }

    const attempt: TWorkspaceSaveAttempt = {
      id: crypto.randomUUID(),
      recordingId: current.id,
      createdAt: current.createdAt,
      projectId,
      name: normalizedName,
    };

    if (!workspaceStore.retainSaveAttempt(attempt)) return false;

    isBusy.value = true;

    try {
      const summary = await projectStore.saveRecordingToProject({
        projectId: attempt.projectId,
        recordingId: attempt.recordingId,
        name: attempt.name,
        createdAt: attempt.createdAt,
        recording: current.recording,
      });

      if (!summary) return false;

      return workspaceStore.completeSave(attempt.id);
    } finally {
      isBusy.value = false;
    }
  }

  async function retryWorkspaceSave(): Promise<boolean> {
    if (isBusy.value || projectStore.isBusy) return false;

    const current = workspaceStore.workspaceRecording;
    const attempt = workspaceStore.saveAttempt;

    if (!current || !attempt) return false;

    if (
      current.id !== attempt.recordingId ||
      current.createdAt !== attempt.createdAt
    ) {
      return false;
    }

    if (current.projectId !== null || !current.hasUnsavedChanges) {
      return false;
    }

    isBusy.value = true;

    try {
      const summary = await projectStore.saveRecordingToProject({
        projectId: attempt.projectId,
        recordingId: attempt.recordingId,
        name: attempt.name,
        createdAt: attempt.createdAt,
        recording: current.recording,
      });

      if (!summary) return false;

      return workspaceStore.completeSave(attempt.id);
    } finally {
      isBusy.value = false;
    }
  }

  function abandonSaveAttempt(attemptId: string): boolean {
    if (isBusy.value || projectStore.isBusy) return false;

    return workspaceStore.clearSaveAttempt(attemptId);
  }

  return {
    isBusy,
    openProjectRecording,
    saveWorkspaceRecording,
    retryWorkspaceSave,
    abandonSaveAttempt,
  };
}

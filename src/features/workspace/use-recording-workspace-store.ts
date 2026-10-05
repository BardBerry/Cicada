import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { TTypingRecording } from '@/features/typing/typing-recording.model';

import type {
  TWorkspaceRecording,
  TWorkspaceSaveAttempt,
} from './workspace-recording.model';

type TStageRecordingParams = {
  recording: TTypingRecording;
  expectedRecordingId: string | null;
};

type TReplaceRecordingParams = {
  expectedRecordingId: string | null;
  nextRecording: TWorkspaceRecording;
};

export const useRecordingWorkspaceStore = defineStore(
  'recording-workspace',
  () => {
    const workspaceRecording = ref<TWorkspaceRecording | null>(null);
    const saveAttempt = ref<TWorkspaceSaveAttempt | null>(null);

    function stageRecording({
      recording,
      expectedRecordingId,
    }: TStageRecordingParams): boolean {
      if (saveAttempt.value) return false;

      return replaceRecording({
        expectedRecordingId,
        nextRecording: {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          recording,
          projectId: null,
          hasUnsavedChanges: true,
        },
      });
    }

    function replaceRecording({
      expectedRecordingId,
      nextRecording,
    }: TReplaceRecordingParams): boolean {
      if (saveAttempt.value) return false;
      if ((workspaceRecording.value?.id ?? null) !== expectedRecordingId) {
        return false;
      }

      workspaceRecording.value = nextRecording;
      return true;
    }

    function clearRecording(expectedRecordingId: string | null): boolean {
      if (saveAttempt.value) return false;
      if ((workspaceRecording.value?.id ?? null) !== expectedRecordingId) {
        return false;
      }

      workspaceRecording.value = null;
      return true;
    }

    function retainSaveAttempt(attempt: TWorkspaceSaveAttempt): boolean {
      const current = workspaceRecording.value;

      if (!current || saveAttempt.value) return false;

      if (
        current.id !== attempt.recordingId ||
        current.createdAt !== attempt.createdAt
      ) {
        return false;
      }

      if (current.projectId !== null || !current.hasUnsavedChanges) {
        return false;
      }

      saveAttempt.value = attempt;
      return true;
    }

    function completeSave(attemptId: string): boolean {
      const current = workspaceRecording.value;
      const attempt = saveAttempt.value;

      if (!current || !attempt) return false;
      if (attempt.id !== attemptId) return false;

      if (
        current.id !== attempt.recordingId ||
        current.createdAt !== attempt.createdAt
      ) {
        return false;
      }

      if (current.projectId !== null || !current.hasUnsavedChanges) {
        return false;
      }

      workspaceRecording.value = {
        ...current,
        projectId: attempt.projectId,
        hasUnsavedChanges: false,
      };
      saveAttempt.value = null;
      return true;
    }

    function clearSaveAttempt(attemptId: string): boolean {
      if (saveAttempt.value?.id !== attemptId) return false;

      saveAttempt.value = null;
      return true;
    }

    return {
      workspaceRecording,
      saveAttempt,
      stageRecording,
      replaceRecording,
      clearRecording,
      retainSaveAttempt,
      completeSave,
      clearSaveAttempt,
    };
  },
);

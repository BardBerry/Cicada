import { defineStore } from 'pinia';
import { ref, shallowReadonly } from 'vue';

import type { TTypingRecording } from '@/features/typing/typing-recording.model';

import {
  EWorkspaceRecordingState,
  type TWorkspaceRecording,
  type TWorkspaceSaveAttempt,
} from './workspace-recording.model';

type TStageRecordingParams = {
  recording: TTypingRecording;
  expectedRecordingId: string | null;
  expectedGeneration: number;
};

type TReplaceRecordingParams = {
  expectedRecordingId: string | null;
  expectedGeneration: number;
  nextRecording: TWorkspaceRecording;
};

type TCompleteSaveParams = {
  attemptId: string;
  expectedGeneration: number;
};

type TClearRecordingParams = {
  expectedRecordingId: string | null;
  expectedGeneration: number;
};

export const useRecordingWorkspaceStore = defineStore(
  'recording-workspace',
  () => {
    const workspaceRecording = ref<TWorkspaceRecording | null>(null);
    const saveAttempt = ref<TWorkspaceSaveAttempt | null>(null);
    const isSaveInFlight = ref(false);
    const workspaceGeneration = ref(0);

    function stageRecording({
      recording,
      expectedRecordingId,
      expectedGeneration,
    }: TStageRecordingParams): boolean {
      if (workspaceRecording.value?.state === EWorkspaceRecordingState.Saved) {
        return false;
      }

      return replaceRecording({
        expectedRecordingId,
        expectedGeneration,
        nextRecording: {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          recording,
          state: EWorkspaceRecordingState.Temporary,
        },
      });
    }

    function replaceRecording({
      expectedRecordingId,
      expectedGeneration,
      nextRecording,
    }: TReplaceRecordingParams): boolean {
      if (saveAttempt.value || isSaveInFlight.value) return false;
      if (workspaceGeneration.value !== expectedGeneration) return false;
      if ((workspaceRecording.value?.id ?? null) !== expectedRecordingId) {
        return false;
      }

      workspaceRecording.value = ownWorkspaceRecording(nextRecording);
      workspaceGeneration.value += 1;
      return true;
    }

    function clearRecording({
      expectedRecordingId,
      expectedGeneration,
    }: TClearRecordingParams): boolean {
      if (saveAttempt.value || isSaveInFlight.value) return false;
      if (workspaceGeneration.value !== expectedGeneration) return false;
      if ((workspaceRecording.value?.id ?? null) !== expectedRecordingId) {
        return false;
      }

      workspaceRecording.value = null;
      workspaceGeneration.value += 1;
      return true;
    }

    function retainSaveAttempt(attempt: TWorkspaceSaveAttempt): boolean {
      const current = workspaceRecording.value;

      if (!current || saveAttempt.value || isSaveInFlight.value) return false;

      if (
        current.id !== attempt.recordingId ||
        current.createdAt !== attempt.createdAt
      ) {
        return false;
      }

      if (current.state !== EWorkspaceRecordingState.Temporary) {
        return false;
      }

      saveAttempt.value = Object.freeze({ ...attempt });
      workspaceGeneration.value += 1;
      return true;
    }

    function beginSave(attemptId: string): boolean {
      const current = workspaceRecording.value;
      const attempt = saveAttempt.value;

      if (!current || !attempt || isSaveInFlight.value) return false;
      if (attempt.id !== attemptId) return false;
      if (current.state !== EWorkspaceRecordingState.Temporary) return false;
      if (
        current.id !== attempt.recordingId ||
        current.createdAt !== attempt.createdAt
      ) {
        return false;
      }

      isSaveInFlight.value = true;
      return true;
    }

    function finishSave(attemptId: string): void {
      if (saveAttempt.value?.id !== attemptId) return;
      isSaveInFlight.value = false;
    }

    function completeSave({
      attemptId,
      expectedGeneration,
    }: TCompleteSaveParams): boolean {
      const current = workspaceRecording.value;
      const attempt = saveAttempt.value;

      if (!current || !attempt || !isSaveInFlight.value) return false;
      if (attempt.id !== attemptId) return false;
      if (workspaceGeneration.value !== expectedGeneration) return false;

      if (
        current.id !== attempt.recordingId ||
        current.createdAt !== attempt.createdAt
      ) {
        return false;
      }

      if (current.state !== EWorkspaceRecordingState.Temporary) {
        return false;
      }

      workspaceRecording.value = Object.freeze({
        ...current,
        state: EWorkspaceRecordingState.Saved,
      });
      isSaveInFlight.value = false;
      saveAttempt.value = null;
      workspaceGeneration.value += 1;
      return true;
    }

    function clearSaveAttempt(attemptId: string): boolean {
      if (isSaveInFlight.value) return false;
      if (saveAttempt.value?.id !== attemptId) return false;

      saveAttempt.value = null;
      workspaceGeneration.value += 1;
      return true;
    }

    return {
      workspaceRecording: shallowReadonly(workspaceRecording),
      saveAttempt: shallowReadonly(saveAttempt),
      isSaveInFlight: shallowReadonly(isSaveInFlight),
      workspaceGeneration: shallowReadonly(workspaceGeneration),
      stageRecording,
      replaceRecording,
      clearRecording,
      retainSaveAttempt,
      beginSave,
      finishSave,
      completeSave,
      clearSaveAttempt,
    };
  },
);

function ownWorkspaceRecording(
  nextRecording: TWorkspaceRecording,
): TWorkspaceRecording {
  // Sever caller aliases and disallow in-place edits, including during retries.
  const recording: TTypingRecording = {
    durationMs: nextRecording.recording.durationMs,
    events: nextRecording.recording.events.map(({ elapsedMs, event }) =>
      Object.freeze({ elapsedMs, event: Object.freeze({ ...event }) }),
    ),
  };

  Object.freeze(recording.events);
  Object.freeze(recording);

  return Object.freeze({ ...nextRecording, recording });
}

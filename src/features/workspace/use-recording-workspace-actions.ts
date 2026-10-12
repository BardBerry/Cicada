import { useRecordingCatalogStore } from '@/features/recordings/use-recording-catalog-store';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';

import { useRecordingWorkspaceStore } from './use-recording-workspace-store';
import {
  EWorkspaceRecordingState,
  type TWorkspaceRecording,
} from './workspace-recording.model';

type TOpenRecordingParams = {
  recordingId: string;
  canAccept: () => boolean;
  onAccepted: (recording: TWorkspaceRecording) => void;
};

export function useRecordingWorkspaceActions() {
  const catalogStore = useRecordingCatalogStore();
  const typingSessionStore = useTypingSessionStore();
  const workspaceStore = useRecordingWorkspaceStore();

  async function openRecording({
    recordingId,
    canAccept,
    onAccepted,
  }: TOpenRecordingParams): Promise<boolean> {
    if (
      typingSessionStore.isRecording ||
      !canAccept() ||
      catalogStore.isBusy ||
      workspaceStore.saveAttempt
    ) {
      return false;
    }

    const expectedRecordingId = workspaceStore.workspaceRecording?.id ?? null;
    const expectedGeneration = workspaceStore.workspaceGeneration;
    const loaded = await catalogStore.loadRecording(recordingId);

    if (!loaded || typingSessionStore.isRecording || !canAccept()) return false;

    const accepted = workspaceStore.replaceRecording({
      expectedRecordingId,
      expectedGeneration,
      nextRecording: {
        id: loaded.summary.id,
        createdAt: loaded.summary.createdAt,
        recording: loaded.recording,
        state: EWorkspaceRecordingState.Saved,
      },
    });

    if (!accepted) return false;

    // Session presentation changes only after the guarded replacement, without an await.
    onAccepted(workspaceStore.workspaceRecording!);
    return true;
  }

  async function saveWorkspaceRecording(): Promise<boolean> {
    if (catalogStore.isBusy || workspaceStore.isSaveInFlight) return false;

    const current = workspaceStore.workspaceRecording;
    if (!current || current.state !== EWorkspaceRecordingState.Temporary) {
      return false;
    }

    if (!workspaceStore.saveAttempt) {
      if (
        !workspaceStore.retainSaveAttempt({
          id: crypto.randomUUID(),
          recordingId: current.id,
          createdAt: current.createdAt,
          name: null,
        })
      ) {
        return false;
      }
    }

    const attempt = workspaceStore.saveAttempt;
    if (!attempt || !workspaceStore.beginSave(attempt.id)) return false;

    const expectedGeneration = workspaceStore.workspaceGeneration;

    try {
      const summary = await catalogStore.saveRecording({
        id: attempt.recordingId,
        createdAt: attempt.createdAt,
        name: attempt.name,
        recording: current.recording,
      });

      if (!summary) return false;

      const accepted = workspaceStore.completeSave({
        attemptId: attempt.id,
        expectedGeneration,
      });

      if (accepted && !typingSessionStore.isReplaying) {
        typingSessionStore.showRecording(current.recording);
      }

      return accepted;
    } finally {
      workspaceStore.finishSave(attempt.id);
    }
  }

  function abandonSaveAttempt(): boolean {
    const attempt = workspaceStore.saveAttempt;
    return !attempt || workspaceStore.clearSaveAttempt(attempt.id);
  }

  return { openRecording, saveWorkspaceRecording, abandonSaveAttempt };
}

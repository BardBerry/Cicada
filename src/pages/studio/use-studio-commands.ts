import {
  EAppCommand,
  type TCommandAvailability,
  type TCommandHandler,
} from '@/app/commands/app-command.model';
import type { TStudioCommand } from '@/app/commands/app-command-routing';
import { useStudioUiStore } from '@/app/use-studio-ui-store';
import { useRecordingCatalogStore } from '@/features/recordings/use-recording-catalog-store';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
import { useRecordingWorkspaceActions } from '@/features/workspace/use-recording-workspace-actions';
import { useRecordingWorkspaceStore } from '@/features/workspace/use-recording-workspace-store';
import { EWorkspaceRecordingState } from '@/features/workspace/workspace-recording.model';

import { useStudioRecordingWorkflowStore } from './use-studio-recording-workflow-store';

type TUseStudioCommandsParams = {
  focusLiveInput: () => void;
  focusCaptionInput: () => void;
  blurCaptionInput: () => void;
};

export function useStudioCommands(
  ui: TUseStudioCommandsParams,
): TCommandHandler<TStudioCommand> {
  const studioUiStore = useStudioUiStore();
  const typingSessionStore = useTypingSessionStore();
  const workspaceStore = useRecordingWorkspaceStore();
  const catalogStore = useRecordingCatalogStore();
  const workflowStore = useStudioRecordingWorkflowStore();
  const workspaceActions = useRecordingWorkspaceActions();

  function getAvailability(command: TStudioCommand): TCommandAvailability {
    const content = workspaceStore.workspaceRecording;

    switch (command) {
      case EAppCommand.StartRecording:
        if (typingSessionStore.isRecording) {
          return { enabled: false, disabledReason: 'Recording in progress' };
        }
        if (content?.state === EWorkspaceRecordingState.Saved) {
          return {
            enabled: false,
            disabledReason: 'Start a new recording first',
          };
        }
        if (workspaceStore.isSaveInFlight) {
          return { enabled: false, disabledReason: 'Save in progress' };
        }
        if (workflowStore.captureReplacementTarget) {
          return { enabled: false, disabledReason: 'Recording is finishing' };
        }
        return { enabled: true };
      case EAppCommand.StopRecording:
        return typingSessionStore.isRecording
          ? { enabled: true }
          : { enabled: false, disabledReason: 'No recording in progress' };
      case EAppCommand.SaveRecording:
        if (typingSessionStore.isRecording) {
          return { enabled: false, disabledReason: 'Finish recording first' };
        }
        if (!content) {
          return { enabled: false, disabledReason: 'Record something first' };
        }
        if (content.state === EWorkspaceRecordingState.Saved) {
          return { enabled: false, disabledReason: 'Already saved' };
        }
        if (workspaceStore.isSaveInFlight) {
          return { enabled: false, disabledReason: 'Save in progress' };
        }
        if (catalogStore.isBusy) {
          return {
            enabled: false,
            disabledReason: 'Recording catalog is busy',
          };
        }
        return { enabled: true };
      case EAppCommand.NewRecording:
        return workspaceStore.isSaveInFlight
          ? { enabled: false, disabledReason: 'Save in progress' }
          : { enabled: true };
      case EAppCommand.StartReplay:
        if (typingSessionStore.isRecording) {
          return { enabled: false, disabledReason: 'Finish recording first' };
        }
        return content
          ? { enabled: true }
          : { enabled: false, disabledReason: 'Record something first' };
      case EAppCommand.StopReplay:
        return typingSessionStore.isReplaying
          ? { enabled: true }
          : { enabled: false, disabledReason: 'No replay in progress' };
      case EAppCommand.EnterZenMode:
        return studioUiStore.isZenMode
          ? { enabled: false, disabledReason: 'Already in Zen mode' }
          : { enabled: true };
      case EAppCommand.ExitZenMode:
        return studioUiStore.isZenMode
          ? { enabled: true }
          : { enabled: false, disabledReason: 'Not in Zen mode' };
      case EAppCommand.FocusCaptionInput:
        return content || typingSessionStore.isReplaying
          ? { enabled: false, disabledReason: 'Recording preview is read-only' }
          : { enabled: true };
      case EAppCommand.BlurCaptionInput:
        return { enabled: true };
    }
  }

  // Internal delegate: the application dispatcher checks this owner's availability.
  function execute(command: TStudioCommand): boolean {
    switch (command) {
      case EAppCommand.StartRecording:
        // Capture admission and replacement must remain one synchronous workflow.
        typingSessionStore.stopReplay();
        if (!typingSessionStore.startRecording()) return false;
        workspaceActions.abandonSaveAttempt();
        workspaceStore.clearRecording({
          expectedRecordingId: workspaceStore.workspaceRecording?.id ?? null,
          expectedGeneration: workspaceStore.workspaceGeneration,
        });
        workflowStore.retainCaptureReplacementTarget({
          expectedRecordingId: null,
          expectedGeneration: workspaceStore.workspaceGeneration,
        });
        ui.focusLiveInput();
        return true;
      case EAppCommand.StopRecording: {
        const target = workflowStore.captureReplacementTarget;
        try {
          const recording = typingSessionStore.stopRecording();
          if (!recording || !target) return false;
          if (
            !workspaceStore.stageRecording({ recording, ...target }) ||
            !workspaceStore.workspaceRecording
          ) {
            return false;
          }
          typingSessionStore.showRecording(
            workspaceStore.workspaceRecording.recording,
          );
          ui.blurCaptionInput();
          return true;
        } finally {
          // A failed stop can leave capture active and need its original target.
          if (!typingSessionStore.isRecording)
            workflowStore.clearCaptureReplacementTarget();
        }
      }
      case EAppCommand.NewRecording:
        typingSessionStore.stopReplay();
        typingSessionStore.cancelRecording();
        workflowStore.clearCaptureReplacementTarget();
        workspaceActions.abandonSaveAttempt();
        workspaceStore.clearRecording({
          expectedRecordingId: workspaceStore.workspaceRecording?.id ?? null,
          expectedGeneration: workspaceStore.workspaceGeneration,
        });
        typingSessionStore.resetSession();
        return true;
      case EAppCommand.SaveRecording:
        void workspaceActions.saveWorkspaceRecording();
        return true;
      case EAppCommand.StartReplay: {
        const recording = workspaceStore.workspaceRecording?.recording;
        if (!recording) return false;

        ui.blurCaptionInput();
        typingSessionStore.startReplay(recording);
        return true;
      }
      case EAppCommand.StopReplay:
        typingSessionStore.stopReplay();
        return true;
      case EAppCommand.EnterZenMode:
        studioUiStore.enterZenMode();
        if (!workspaceStore.workspaceRecording) ui.focusCaptionInput();
        return true;
      case EAppCommand.ExitZenMode:
        studioUiStore.exitZenMode();
        return true;
      case EAppCommand.FocusCaptionInput:
        ui.focusCaptionInput();
        return true;
      case EAppCommand.BlurCaptionInput:
        ui.blurCaptionInput();
        return true;
    }
  }

  return { getAvailability, execute };
}

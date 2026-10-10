import { useRoute } from 'vue-router';

import {
  EAppCommand,
  ECommandRelevance,
  type TCommandAvailability,
  type TCommandEvaluation,
  type TCommandOwner,
} from '@/app/commands/app-command.model';
import { EAppRouteName } from '@/app/router/app-route.model';
import { useStudioUiStore } from '@/app/use-studio-ui-store';
import { useRecordingCatalogStore } from '@/features/recordings/use-recording-catalog-store';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
import { useRecordingWorkspaceActions } from '@/features/workspace/use-recording-workspace-actions';
import { useRecordingWorkspaceStore } from '@/features/workspace/use-recording-workspace-store';
import { EWorkspaceRecordingState } from '@/features/workspace/workspace-recording.model';

import { useStudioRecordingWorkflowStore } from './use-studio-recording-workflow-store';

const STUDIO_COMMANDS = [
  EAppCommand.StartRecording,
  EAppCommand.StopRecording,
  EAppCommand.ToggleRecording,
  EAppCommand.NewRecording,
  EAppCommand.SaveRecording,
  EAppCommand.StartReplay,
  EAppCommand.StopReplay,
  EAppCommand.ToggleReplay,
  EAppCommand.EnterZenMode,
  EAppCommand.ExitZenMode,
  EAppCommand.ToggleZenMode,
  EAppCommand.FocusCaptionInput,
  EAppCommand.BlurCaptionInput,
] as const;

type TStudioCommand = (typeof STUDIO_COMMANDS)[number];

type TUseStudioCommandsParams = {
  focusLiveInput: () => void;
  focusCaptionInput: () => void;
  blurCaptionInput: () => void;
};

export function useStudioCommands(
  ui: TUseStudioCommandsParams,
): TCommandOwner<TStudioCommand> {
  const route = useRoute();
  const studioUiStore = useStudioUiStore();
  const typingSessionStore = useTypingSessionStore();
  const workspaceStore = useRecordingWorkspaceStore();
  const catalogStore = useRecordingCatalogStore();
  const workflowStore = useStudioRecordingWorkflowStore();
  const workspaceActions = useRecordingWorkspaceActions();

  function resolveOperation(
    command: TStudioCommand,
  ): Exclude<
    TStudioCommand,
    | EAppCommand.ToggleRecording
    | EAppCommand.ToggleReplay
    | EAppCommand.ToggleZenMode
  > {
    switch (command) {
      case EAppCommand.ToggleRecording:
        return typingSessionStore.isRecording
          ? EAppCommand.StopRecording
          : EAppCommand.StartRecording;
      case EAppCommand.ToggleReplay:
        return typingSessionStore.isReplaying
          ? EAppCommand.StopReplay
          : EAppCommand.StartReplay;
      case EAppCommand.ToggleZenMode:
        return studioUiStore.isZenMode
          ? EAppCommand.ExitZenMode
          : EAppCommand.EnterZenMode;
      default:
        return command;
    }
  }

  function getShortcutFallback(
    command: TStudioCommand,
  ): EAppCommand | undefined {
    for (const toggle of [
      EAppCommand.ToggleRecording,
      EAppCommand.ToggleReplay,
      EAppCommand.ToggleZenMode,
    ] as const) {
      if (resolveOperation(toggle) === command) return toggle;
    }
  }

  function evaluate(command: TStudioCommand): TCommandEvaluation {
    if (route.name !== EAppRouteName.Studio) {
      return {
        availability: { enabled: false, disabledReason: 'Available in Studio' },
        relevance: null,
      };
    }
    const operation = resolveOperation(command);
    return {
      availability: getAvailability(operation),
      relevance: getRelevance(operation),
      shortcutFallback: getShortcutFallback(command),
    };
  }

  function getRelevance(
    command: ReturnType<typeof resolveOperation>,
  ): ECommandRelevance | null {
    const content = workspaceStore.workspaceRecording;
    const isRecording = typingSessionStore.isRecording;
    const isReplaying = typingSessionStore.isReplaying;

    switch (command) {
      case EAppCommand.StartRecording:
        if (isRecording || content?.state === EWorkspaceRecordingState.Saved) {
          return null;
        }
        return !content && !isReplaying
          ? ECommandRelevance.CurrentTask
          : ECommandRelevance.Local;
      case EAppCommand.StopRecording:
        return isRecording ? ECommandRelevance.ActiveOperation : null;
      case EAppCommand.SaveRecording:
        if (
          isRecording ||
          content?.state !== EWorkspaceRecordingState.Temporary
        ) {
          return null;
        }
        return isReplaying
          ? ECommandRelevance.Local
          : ECommandRelevance.CurrentTask;
      case EAppCommand.NewRecording:
        return content ||
          isRecording ||
          isReplaying ||
          typingSessionStore.session.text ||
          typingSessionStore.session.captions.length
          ? ECommandRelevance.Local
          : null;
      case EAppCommand.StartReplay:
        if (!content || isRecording || isReplaying) return null;
        return content.state === EWorkspaceRecordingState.Saved
          ? ECommandRelevance.CurrentTask
          : ECommandRelevance.Local;
      case EAppCommand.StopReplay:
        return isReplaying ? ECommandRelevance.ActiveOperation : null;
      case EAppCommand.EnterZenMode:
        return studioUiStore.isZenMode ? null : ECommandRelevance.Local;
      case EAppCommand.ExitZenMode:
        return studioUiStore.isZenMode ? ECommandRelevance.Local : null;
      case EAppCommand.FocusCaptionInput:
      case EAppCommand.BlurCaptionInput:
        return null;
    }
  }

  function getAvailability(
    command: ReturnType<typeof resolveOperation>,
  ): TCommandAvailability {
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
        if (typingSessionStore.isReplaying) {
          return {
            enabled: false,
            disabledReason: 'Replay already in progress',
          };
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
    switch (resolveOperation(command)) {
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

  return { commands: STUDIO_COMMANDS, evaluate, execute };
}

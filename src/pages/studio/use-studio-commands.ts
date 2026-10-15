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
import { useRecordingExportStore } from '@/features/recording-export/use-recording-export-store';
import { useRecordingCatalogStore } from '@/features/recordings/use-recording-catalog-store';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
import { useRecordingWorkspaceActions } from '@/features/workspace/use-recording-workspace-actions';
import { useRecordingWorkspaceStore } from '@/features/workspace/use-recording-workspace-store';
import { EWorkspaceRecordingState } from '@/features/workspace/workspace-recording.model';
import { CURRENT_PLATFORM, EPlatform } from '@/shared/platform/platform';

import { useStudioRecordingWorkflowStore } from './use-studio-recording-workflow-store';

const STUDIO_COMMANDS = [
  EAppCommand.OpenRecording,
  EAppCommand.ExportRecording,
  EAppCommand.StartRecording,
  EAppCommand.StopRecording,
  EAppCommand.ToggleRecording,
  EAppCommand.RetakeRecording,
  EAppCommand.ClearSession,
  EAppCommand.DiscardDraft,
  EAppCommand.NewSession,
  EAppCommand.SaveRecording,
  EAppCommand.StartReplay,
  EAppCommand.StopReplay,
  EAppCommand.ToggleReplay,
  EAppCommand.EnterChromaMode,
  EAppCommand.ExitChromaMode,
  EAppCommand.ToggleChromaMode,
  EAppCommand.FocusCaptionInput,
  EAppCommand.BlurCaptionInput,
] as const;

type TStudioCommand = (typeof STUDIO_COMMANDS)[number];

type TUseStudioCommandsParams = {
  openRecordingPicker: () => void;
  openExportDialog: () => void;
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
  const exportStore = useRecordingExportStore();

  function resolveOperation(
    command: TStudioCommand,
  ): Exclude<
    TStudioCommand,
    | EAppCommand.ToggleRecording
    | EAppCommand.ToggleReplay
    | EAppCommand.ToggleChromaMode
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
      case EAppCommand.ToggleChromaMode:
        return studioUiStore.isChromaMode
          ? EAppCommand.ExitChromaMode
          : EAppCommand.EnterChromaMode;
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
      EAppCommand.ToggleChromaMode,
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
      label:
        operation === EAppCommand.StartReplay &&
        workspaceStore.workspaceRecording?.state ===
          EWorkspaceRecordingState.Temporary
          ? 'Replay Draft'
          : undefined,
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
      case EAppCommand.ExportRecording:
        return CURRENT_PLATFORM === EPlatform.MacOS
          ? ECommandRelevance.Contextual
          : null;
      case EAppCommand.OpenRecording:
        return ECommandRelevance.Contextual;
      case EAppCommand.StartRecording:
        if (
          isRecording ||
          content?.state === EWorkspaceRecordingState.Saved ||
          content?.state === EWorkspaceRecordingState.Temporary
        ) {
          return null;
        }
        return !content && !isReplaying
          ? ECommandRelevance.PrimaryAction
          : ECommandRelevance.Contextual;
      case EAppCommand.StopRecording:
        return isRecording ? ECommandRelevance.ActiveOperation : null;
      case EAppCommand.RetakeRecording:
        if (content?.state === EWorkspaceRecordingState.Saved) return null;
        if (isRecording) return ECommandRelevance.ActiveOperation;
        return content?.state === EWorkspaceRecordingState.Temporary
          ? ECommandRelevance.Contextual
          : null;
      case EAppCommand.SaveRecording:
        if (
          isRecording ||
          content?.state !== EWorkspaceRecordingState.Temporary
        ) {
          return null;
        }
        return isReplaying
          ? ECommandRelevance.Contextual
          : ECommandRelevance.PrimaryAction;
      case EAppCommand.ClearSession:
        return !content &&
          !isRecording &&
          !isReplaying &&
          (typingSessionStore.session.text ||
            typingSessionStore.session.captions.length)
          ? ECommandRelevance.Contextual
          : null;
      case EAppCommand.DiscardDraft:
        return content?.state === EWorkspaceRecordingState.Temporary
          ? ECommandRelevance.Contextual
          : null;
      case EAppCommand.NewSession:
        return content?.state === EWorkspaceRecordingState.Saved
          ? ECommandRelevance.Contextual
          : null;
      case EAppCommand.StartReplay:
        if (!content || isRecording || isReplaying) return null;
        return content.state === EWorkspaceRecordingState.Saved
          ? ECommandRelevance.PrimaryAction
          : ECommandRelevance.Contextual;
      case EAppCommand.StopReplay:
        return isReplaying ? ECommandRelevance.ActiveOperation : null;
      case EAppCommand.EnterChromaMode:
        return studioUiStore.isChromaMode ? null : ECommandRelevance.Contextual;
      case EAppCommand.ExitChromaMode:
        return studioUiStore.isChromaMode ? ECommandRelevance.Contextual : null;
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
      case EAppCommand.ExportRecording:
        if (CURRENT_PLATFORM !== EPlatform.MacOS)
          return {
            enabled: false,
            disabledReason: 'Experimental export requires macOS',
          };
        if (typingSessionStore.isRecording)
          return { enabled: false, disabledReason: 'Finish recording first' };
        if (workflowStore.captureReplacementTarget)
          return { enabled: false, disabledReason: 'Recording is finishing' };
        if (exportStore.isExporting)
          return { enabled: false, disabledReason: 'Export already running' };
        return content
          ? { enabled: true }
          : { enabled: false, disabledReason: 'No recording loaded' };
      case EAppCommand.OpenRecording:
        if (typingSessionStore.isRecording) {
          return { enabled: false, disabledReason: 'Finish recording first' };
        }
        if (typingSessionStore.isReplaying) {
          return { enabled: false, disabledReason: 'Stop replay first' };
        }
        if (workspaceStore.isSaveInFlight) {
          return { enabled: false, disabledReason: 'Save in progress' };
        }
        if (content?.state === EWorkspaceRecordingState.Temporary) {
          return {
            enabled: false,
            disabledReason: 'Save or discard the draft first',
          };
        }
        if (workflowStore.captureReplacementTarget) {
          return { enabled: false, disabledReason: 'Recording is finishing' };
        }
        if (catalogStore.isBusy) {
          return {
            enabled: false,
            disabledReason: 'Recording catalog is busy',
          };
        }
        return { enabled: true };
      case EAppCommand.StartRecording:
        if (typingSessionStore.isRecording) {
          return { enabled: false, disabledReason: 'Recording in progress' };
        }
        if (content?.state === EWorkspaceRecordingState.Temporary) {
          return {
            enabled: false,
            disabledReason: 'Save or discard the draft first',
          };
        }
        if (content?.state === EWorkspaceRecordingState.Saved) {
          return {
            enabled: false,
            disabledReason: 'Close the saved recording first',
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
      case EAppCommand.RetakeRecording: {
        if (content?.state === EWorkspaceRecordingState.Saved) {
          return {
            enabled: false,
            disabledReason: 'Saved recordings cannot be retaken',
          };
        }
        if (workspaceStore.isSaveInFlight) {
          return { enabled: false, disabledReason: 'Save in progress' };
        }
        const target = workflowStore.captureReplacementTarget;
        if (typingSessionStore.isRecording) {
          const hasValidCaptureTarget =
            !content &&
            target?.expectedRecordingId === null &&
            target.expectedGeneration === workspaceStore.workspaceGeneration;

          return hasValidCaptureTarget
            ? { enabled: true }
            : {
                enabled: false,
                disabledReason: 'Capture target is no longer current',
              };
        }
        if (target) {
          return { enabled: false, disabledReason: 'Recording is finishing' };
        }
        return content?.state === EWorkspaceRecordingState.Temporary
          ? { enabled: true }
          : { enabled: false, disabledReason: 'No recording to retake' };
      }
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
      case EAppCommand.ClearSession:
        if (
          content ||
          typingSessionStore.isRecording ||
          typingSessionStore.isReplaying
        ) {
          return {
            enabled: false,
            disabledReason: 'Only available for free typing',
          };
        }
        if (
          !typingSessionStore.session.text &&
          !typingSessionStore.session.captions.length
        ) {
          return { enabled: false, disabledReason: 'Session is empty' };
        }
        return workspaceStore.isSaveInFlight
          ? { enabled: false, disabledReason: 'Save in progress' }
          : { enabled: true };
      case EAppCommand.DiscardDraft:
      case EAppCommand.NewSession:
        if (
          content?.state !==
          (command === EAppCommand.DiscardDraft
            ? EWorkspaceRecordingState.Temporary
            : EWorkspaceRecordingState.Saved)
        ) {
          return {
            enabled: false,
            disabledReason:
              command === EAppCommand.DiscardDraft
                ? 'No unsaved draft'
                : 'No saved recording loaded',
          };
        }
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
      case EAppCommand.EnterChromaMode:
        return studioUiStore.isChromaMode
          ? { enabled: false, disabledReason: 'Already in Chroma mode' }
          : { enabled: true };
      case EAppCommand.ExitChromaMode:
        return studioUiStore.isChromaMode
          ? { enabled: true }
          : { enabled: false, disabledReason: 'Not in Chroma mode' };
      case EAppCommand.FocusCaptionInput:
        return content || typingSessionStore.isReplaying
          ? { enabled: false, disabledReason: 'Recording preview is read-only' }
          : { enabled: true };
      case EAppCommand.BlurCaptionInput:
        return { enabled: true };
    }
  }

  function startCapture(): boolean {
    const expectedRecordingId = workspaceStore.workspaceRecording?.id ?? null;
    let expectedGeneration = workspaceStore.workspaceGeneration;
    const saveAttempt = workspaceStore.saveAttempt;
    let admitted = false;

    // Admission and guarded replacement stay synchronous; never clear a newer workspace.
    typingSessionStore.stopReplay();
    try {
      if (!typingSessionStore.startRecording()) return false;
      if (
        workspaceStore.workspaceGeneration !== expectedGeneration ||
        (workspaceStore.workspaceRecording?.id ?? null) !==
          expectedRecordingId ||
        !workspaceActions.abandonSaveAttempt()
      ) {
        return false;
      }
      // Abandoning a retained retry advances the generation exactly once.
      if (saveAttempt) expectedGeneration += 1;
      if (
        !workspaceStore.clearRecording({
          expectedRecordingId,
          expectedGeneration,
        })
      ) {
        return false;
      }
      admitted = workflowStore.retainCaptureReplacementTarget({
        expectedRecordingId: null,
        expectedGeneration: expectedGeneration + 1,
      });
      if (!admitted) return false;
    } finally {
      if (!admitted) {
        typingSessionStore.cancelRecording();

        const recording = workspaceStore.workspaceRecording?.recording;
        if (recording) {
          typingSessionStore.showRecording(recording);
        }
      }
    }
    ui.focusLiveInput();
    return true;
  }

  // Internal delegate: the application dispatcher checks this owner's availability.
  function execute(command: TStudioCommand): boolean {
    switch (resolveOperation(command)) {
      case EAppCommand.ExportRecording: {
        if (!workspaceStore.workspaceRecording) return false;
        ui.openExportDialog();
        return true;
      }
      case EAppCommand.OpenRecording:
        ui.openRecordingPicker();
        return true;
      case EAppCommand.StartRecording:
        return startCapture();
      case EAppCommand.RetakeRecording:
        if (!getAvailability(EAppCommand.RetakeRecording).enabled) return false;
        if (typingSessionStore.isRecording) {
          workflowStore.clearCaptureReplacementTarget();
          typingSessionStore.cancelRecording();
        }
        return startCapture();
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
      case EAppCommand.ClearSession:
      case EAppCommand.DiscardDraft:
      case EAppCommand.NewSession:
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
      case EAppCommand.EnterChromaMode:
        studioUiStore.enterChromaMode();
        if (!workspaceStore.workspaceRecording) ui.focusCaptionInput();
        return true;
      case EAppCommand.ExitChromaMode:
        studioUiStore.exitChromaMode();
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

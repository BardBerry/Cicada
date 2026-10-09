import { EAppCommand } from './app-command.model';

export type TStudioCommand =
  | EAppCommand.StartRecording
  | EAppCommand.StopRecording
  | EAppCommand.NewRecording
  | EAppCommand.SaveRecording
  | EAppCommand.StartReplay
  | EAppCommand.StopReplay
  | EAppCommand.EnterZenMode
  | EAppCommand.ExitZenMode
  | EAppCommand.FocusCaptionInput
  | EAppCommand.BlurCaptionInput;

export function isStudioCommand(
  command: EAppCommand,
): command is TStudioCommand {
  switch (command) {
    case EAppCommand.OpenCommandPalette:
    case EAppCommand.GoToStudio:
    case EAppCommand.GoToSettings:
      return false;
    case EAppCommand.StartRecording:
    case EAppCommand.StopRecording:
    case EAppCommand.NewRecording:
    case EAppCommand.SaveRecording:
    case EAppCommand.StartReplay:
    case EAppCommand.StopReplay:
    case EAppCommand.EnterZenMode:
    case EAppCommand.ExitZenMode:
    case EAppCommand.FocusCaptionInput:
    case EAppCommand.BlurCaptionInput:
      return true;
    default: {
      const unhandled: never = command;
      throw new Error(`Unhandled command: ${unhandled}`);
    }
  }
}

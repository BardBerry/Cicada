import { EAppCommand } from './app-command.model';

export const GLOBAL_COMMANDS = [
  EAppCommand.OpenCommandPalette,
  EAppCommand.GoToStudio,
  EAppCommand.GoToSettings,
] as const;

export type TGlobalCommand = (typeof GLOBAL_COMMANDS)[number];

export const STUDIO_COMMANDS = [
  EAppCommand.StartRecording,
  EAppCommand.StopRecording,
  EAppCommand.NewRecording,
  EAppCommand.SaveRecording,
  EAppCommand.StartReplay,
  EAppCommand.StopReplay,
  EAppCommand.EnterZenMode,
  EAppCommand.ExitZenMode,
  EAppCommand.FocusCaptionInput,
  EAppCommand.BlurCaptionInput,
] as const;

export type TStudioCommand = (typeof STUDIO_COMMANDS)[number];

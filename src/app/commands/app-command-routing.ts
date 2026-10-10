import { EAppRouteName } from '../router/app-route.model';
import { EAppCommand } from './app-command.model';

export const GLOBAL_NAVIGATION_COMMANDS = [
  {
    command: EAppCommand.GoToStudio,
    destination: EAppRouteName.Studio,
  },
  {
    command: EAppCommand.GoToSettings,
    destination: EAppRouteName.Settings,
  },
] as const satisfies readonly {
  command: EAppCommand;
  destination: EAppRouteName;
}[];

export const GLOBAL_COMMANDS = [
  EAppCommand.OpenCommandPalette,
  ...GLOBAL_NAVIGATION_COMMANDS.map(({ command }) => command),
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

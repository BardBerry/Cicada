import { EAppCommand } from '../commands/app-command.model';
import { EStudioMode } from '../studio/studio.model';
import type { TKeybinding } from './keymap.model';

export const KEYBINDINGS: TKeybinding[] = [
  {
    command: EAppCommand.ExitCaptureMode,
    studioMode: EStudioMode.Capture,
    shortcut: {
      code: 'Escape',
    },
  },
  {
    command: EAppCommand.BlurCaptionStage,
    studioMode: EStudioMode.Studio,
    shortcut: {
      code: 'Escape',
    },
  },
  {
    command: EAppCommand.EnterCaptureMode,
    studioMode: EStudioMode.Studio,
    shortcut: {
      code: 'KeyC',
      ctrlKey: true,
    },
  },
  {
    command: EAppCommand.ExitCaptureMode,
    studioMode: EStudioMode.Capture,
    shortcut: {
      code: 'KeyC',
      ctrlKey: true,
    },
  },
];

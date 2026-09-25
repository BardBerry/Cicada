import { EStudioMode } from '@/pages/studio/studio.model';

import { EAppCommand } from '../commands/app-command.model';
import type { TKeybinding } from './keymap.model';

export const KEYBINDINGS: TKeybinding[] = [
  {
    command: EAppCommand.ExitZenMode,
    studioMode: EStudioMode.Zen,
    shortcut: {
      code: 'Escape',
    },
  },
  {
    command: EAppCommand.BlurCaptionInput,
    studioMode: EStudioMode.Studio,
    shortcut: {
      code: 'Escape',
    },
  },
  {
    command: EAppCommand.EnterZenMode,
    studioMode: EStudioMode.Studio,
    shortcut: {
      code: 'KeyC',
      ctrlKey: true,
    },
  },
  {
    command: EAppCommand.ExitZenMode,
    studioMode: EStudioMode.Zen,
    shortcut: {
      code: 'KeyC',
      ctrlKey: true,
    },
  },
];

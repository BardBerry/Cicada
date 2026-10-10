import { EAppCommand } from '../commands/app-command.model';
import { EKeymapScope, type TKeybinding } from './keymap.model';

export const KEYBINDINGS: TKeybinding[] = [
  // Global
  {
    command: EAppCommand.OpenCommandPalette,
    shortcut: { code: 'KeyK', modKey: true },
  },
  {
    command: EAppCommand.GoToStudio,
    shortcut: { code: 'Digit1', modKey: true },
  },
  {
    command: EAppCommand.GoToSettings,
    shortcut: { code: 'Comma', modKey: true },
  },

  // Recording
  {
    command: EAppCommand.ToggleRecording,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyR', modKey: true, shiftKey: true },
  },
  {
    command: EAppCommand.SaveRecording,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyS', modKey: true },
  },

  // Playback
  {
    command: EAppCommand.ToggleReplay,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyP', modKey: true, altKey: true },
  },

  // Zen Mode
  {
    command: EAppCommand.ToggleZenMode,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyZ', modKey: true, altKey: true },
  },
];

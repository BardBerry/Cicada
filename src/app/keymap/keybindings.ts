import { EAppCommand } from '../commands/app-command.model';
import { EKeymapScope, type TKeybinding } from './keymap.model';

export const KEYBINDINGS: TKeybinding[] = [
  // Global
  {
    command: EAppCommand.OpenCommandPalette,
    shortcut: { code: 'KeyK', metaKey: true },
  },
  {
    command: EAppCommand.GoToStudio,
    shortcut: { code: 'Digit1', metaKey: true },
  },
  {
    command: EAppCommand.GoToSettings,
    shortcut: { code: 'Comma', metaKey: true },
  },

  // Recording
  {
    command: EAppCommand.StartRecording,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyR', metaKey: true, shiftKey: true },
  },
  {
    command: EAppCommand.StopRecording,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyR', metaKey: true, shiftKey: true },
  },
  {
    command: EAppCommand.SaveRecording,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyS', metaKey: true },
  },

  // Playback
  {
    command: EAppCommand.StartReplay,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyP', metaKey: true, altKey: true },
  },
  {
    command: EAppCommand.StopReplay,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'Period', metaKey: true, altKey: true },
  },

  // Zen Mode
  {
    command: EAppCommand.EnterZenMode,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'KeyZ', metaKey: true, altKey: true },
  },
  {
    command: EAppCommand.ExitZenMode,
    scope: EKeymapScope.StudioZen,
    shortcut: { code: 'KeyZ', metaKey: true, altKey: true },
  },
  {
    command: EAppCommand.ExitZenMode,
    scope: EKeymapScope.StudioZen,
    shortcut: { code: 'Escape' },
  },

  // Input
  {
    command: EAppCommand.BlurCaptionInput,
    scope: EKeymapScope.Studio,
    shortcut: { code: 'Escape' },
  },
];

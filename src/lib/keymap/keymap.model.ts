import { type EAppCommand } from '../commands/app-command.model';
import type { EStudioMode } from '../studio/studio.model';

export type TKeymapContext = {
  studioMode: EStudioMode;
};

export type TShortcut = {
  code: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export type TKeybinding = {
  command: EAppCommand;
  studioMode?: EStudioMode;
  shortcut: TShortcut;
};

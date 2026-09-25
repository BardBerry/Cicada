import { type EStudioMode } from '@/pages/studio/studio.model';

import { type EAppCommand } from '../commands/app-command.model';

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

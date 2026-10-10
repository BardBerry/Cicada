import { type EAppCommand } from '../commands/app-command.model';

export enum EKeymapScope {
  Studio = 'studio',
}

export type TKeymapContext = {
  scope: EKeymapScope | null;
};

export type TShortcut = {
  code: string;
  modKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export type TKeybinding = {
  command: EAppCommand;
  scope?: EKeymapScope;
  shortcut: TShortcut;
};

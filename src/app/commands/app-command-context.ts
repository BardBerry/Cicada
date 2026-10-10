import { type ComputedRef, inject, type InjectionKey, type Ref } from 'vue';

import type { TKeymapContext } from '../keymap/keymap.model';
import type {
  EAppCommand,
  TCommandHandler,
  TCommandOwner,
  TResolvedCommand,
} from './app-command.model';

export type TAppCommands = TCommandHandler & {
  paletteOpen: Ref<boolean>;
  resolvedCommands: ComputedRef<readonly TResolvedCommand[]>;
  keymapContext: ComputedRef<TKeymapContext>;
  registerOwner: (owner: TCommandOwner) => () => void;
  preparePaletteCommand: (command: EAppCommand) => (() => boolean) | null;
};

export const APP_COMMANDS_KEY: InjectionKey<TAppCommands> =
  Symbol('app-commands');

export function useAppCommandDispatcher(): TAppCommands {
  const commands = inject(APP_COMMANDS_KEY);
  if (!commands)
    throw new Error('Application command dispatcher is not provided');
  return commands;
}

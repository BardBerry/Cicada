import type { TKeymapContext, TShortcut } from '../keymap/keymap.model';
import { resolveCommandShortcuts } from '../keymap/resolve-command-shortcuts';
import type { EAppCommand } from './app-command.model';

export function resolveCommandShortcutHints({
  command,
  context,
  fallbackCommand,
}: {
  command: EAppCommand;
  context: TKeymapContext;
  fallbackCommand?: EAppCommand;
}): TShortcut[] {
  const direct = resolveCommandShortcuts({ command, context });

  if (direct.length || fallbackCommand === undefined) return direct;

  return resolveCommandShortcuts({ command: fallbackCommand, context });
}

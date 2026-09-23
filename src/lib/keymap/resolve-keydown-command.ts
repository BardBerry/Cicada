import { type EAppCommand } from '../commands/app-command.model';
import { KEYBINDINGS } from './keybindings';
import type { TKeymapContext, TShortcut } from './keymap.model';

type TResolveKeydownCommandParams = {
  event: KeyboardEvent;
  context: TKeymapContext;
};

function matchesShortcut(event: KeyboardEvent, shortcut: TShortcut) {
  return (
    event.code === shortcut.code &&
    event.altKey === (shortcut.altKey ?? false) &&
    event.ctrlKey === (shortcut.ctrlKey ?? false) &&
    event.metaKey === (shortcut.metaKey ?? false) &&
    event.shiftKey === (shortcut.shiftKey ?? false)
  );
}

export function resolveKeydownCommand({
  event,
  context,
}: TResolveKeydownCommandParams): EAppCommand | null {
  if (event.defaultPrevented || event.isComposing || event.repeat) return null;

  const contextualBinding = KEYBINDINGS.find(
    ({ studioMode, shortcut }) =>
      studioMode === context.studioMode && matchesShortcut(event, shortcut),
  );

  if (contextualBinding) {
    return contextualBinding.command;
  }

  const globalBinding = KEYBINDINGS.find(
    ({ studioMode, shortcut }) =>
      studioMode === undefined && matchesShortcut(event, shortcut),
  );

  return globalBinding?.command ?? null;
}

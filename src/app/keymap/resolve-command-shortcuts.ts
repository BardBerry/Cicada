import type { EAppCommand } from '../commands/app-command.model';
import { KEYBINDINGS } from './keybindings';
import type { TKeymapContext, TShortcut } from './keymap.model';

type TResolveShortcutCommandParams = {
  shortcut: TShortcut;
  context: TKeymapContext;
};

function matchesShortcut(left: TShortcut, right: TShortcut) {
  return (
    left.code === right.code &&
    (left.altKey ?? false) === (right.altKey ?? false) &&
    (left.ctrlKey ?? false) === (right.ctrlKey ?? false) &&
    (left.metaKey ?? false) === (right.metaKey ?? false) &&
    (left.shiftKey ?? false) === (right.shiftKey ?? false)
  );
}

export function resolveShortcutCommand({
  shortcut,
  context,
}: TResolveShortcutCommandParams): EAppCommand | null {
  const contextualBinding =
    context.scope === null
      ? undefined
      : KEYBINDINGS.find(
          (binding) =>
            binding.scope === context.scope &&
            matchesShortcut(shortcut, binding.shortcut),
        );
  const binding =
    contextualBinding ??
    KEYBINDINGS.find(
      (binding) =>
        binding.scope === undefined &&
        matchesShortcut(shortcut, binding.shortcut),
    );
  return binding?.command ?? null;
}

export function resolveCommandShortcuts({
  command,
  context,
}: {
  command: EAppCommand;
  context: TKeymapContext;
}): TShortcut[] {
  const shortcuts: TShortcut[] = [];
  for (const binding of KEYBINDINGS) {
    if (binding.command !== command) continue;
    if (
      resolveShortcutCommand({ shortcut: binding.shortcut, context }) !==
      command
    )
      continue;
    if (
      shortcuts.some((shortcut) => matchesShortcut(shortcut, binding.shortcut))
    )
      continue;
    shortcuts.push(binding.shortcut);
  }
  return shortcuts;
}

export function formatShortcut(shortcut: TShortcut): string {
  const key = shortcut.code.startsWith('Key')
    ? shortcut.code.slice(3)
    : shortcut.code.startsWith('Digit')
      ? shortcut.code.slice(5)
      : shortcut.code === 'Escape'
        ? 'Esc'
        : shortcut.code;
  return [
    shortcut.ctrlKey && 'Ctrl',
    shortcut.altKey && 'Alt',
    shortcut.shiftKey && 'Shift',
    shortcut.metaKey && 'Cmd',
    key,
  ]
    .filter(Boolean)
    .join('+');
}

import type { EAppCommand } from '../commands/app-command.model';
import { KEYBINDINGS } from './keybindings';
import type { TKeymapContext, TShortcut } from './keymap.model';
import { matchesShortcut } from './normalize-shortcut';
import { type EShortcutPlatform, SHORTCUT_PLATFORM } from './shortcut-platform';

type TResolveShortcutCommandParams = {
  shortcut: TShortcut;
  context: TKeymapContext;
  platform?: EShortcutPlatform;
};

export function resolveShortcutCommand({
  shortcut,
  context,
  platform = SHORTCUT_PLATFORM,
}: TResolveShortcutCommandParams): EAppCommand | null {
  const contextualBinding =
    context.scope === null
      ? undefined
      : KEYBINDINGS.find(
          (binding) =>
            binding.scope === context.scope &&
            matchesShortcut({
              left: shortcut,
              right: binding.shortcut,
              platform,
            }),
        );
  const binding =
    contextualBinding ??
    KEYBINDINGS.find(
      (binding) =>
        binding.scope === undefined &&
        matchesShortcut({ left: shortcut, right: binding.shortcut, platform }),
    );
  return binding?.command ?? null;
}

export function resolveCommandShortcuts({
  command,
  context,
  platform = SHORTCUT_PLATFORM,
}: {
  command: EAppCommand;
  context: TKeymapContext;
  platform?: EShortcutPlatform;
}): TShortcut[] {
  const shortcuts: TShortcut[] = [];
  for (const binding of KEYBINDINGS) {
    if (binding.command !== command) continue;
    if (
      resolveShortcutCommand({
        shortcut: binding.shortcut,
        context,
        platform,
      }) !== command
    )
      continue;
    if (
      shortcuts.some((shortcut) =>
        matchesShortcut({ left: shortcut, right: binding.shortcut, platform }),
      )
    )
      continue;
    shortcuts.push(binding.shortcut);
  }
  return shortcuts;
}

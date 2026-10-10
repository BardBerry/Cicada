import type { TShortcut } from './keymap.model';
import { EShortcutPlatform, SHORTCUT_PLATFORM } from './shortcut-platform';

export function normalizeShortcut({
  shortcut,
  platform = SHORTCUT_PLATFORM,
}: {
  shortcut: TShortcut;
  platform?: EShortcutPlatform;
}) {
  // Mod adds the primary modifier; explicit modifiers never cancel it.
  return {
    code: shortcut.code,
    altKey: shortcut.altKey ?? false,
    ctrlKey:
      (shortcut.ctrlKey ?? false) ||
      (shortcut.modKey === true && platform !== EShortcutPlatform.MacOS),
    metaKey:
      (shortcut.metaKey ?? false) ||
      (shortcut.modKey === true && platform === EShortcutPlatform.MacOS),
    shiftKey: shortcut.shiftKey ?? false,
  };
}

export function matchesShortcut({
  left,
  right,
  platform = SHORTCUT_PLATFORM,
}: {
  left: TShortcut;
  right: TShortcut;
  platform?: EShortcutPlatform;
}): boolean {
  const first = normalizeShortcut({ shortcut: left, platform });
  const second = normalizeShortcut({ shortcut: right, platform });
  return (
    first.code === second.code &&
    first.altKey === second.altKey &&
    first.ctrlKey === second.ctrlKey &&
    first.metaKey === second.metaKey &&
    first.shiftKey === second.shiftKey
  );
}

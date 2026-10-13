import { CURRENT_PLATFORM, EPlatform } from '@/shared/platform/platform';

import type { TShortcut } from './keymap.model';

export function normalizeShortcut({
  shortcut,
  platform = CURRENT_PLATFORM,
}: {
  shortcut: TShortcut;
  platform?: EPlatform;
}) {
  // Mod adds the primary modifier; explicit modifiers never cancel it.
  return {
    code: shortcut.code,
    altKey: shortcut.altKey ?? false,
    ctrlKey:
      (shortcut.ctrlKey ?? false) ||
      (shortcut.modKey === true && platform !== EPlatform.MacOS),
    metaKey:
      (shortcut.metaKey ?? false) ||
      (shortcut.modKey === true && platform === EPlatform.MacOS),
    shiftKey: shortcut.shiftKey ?? false,
  };
}

export function matchesShortcut({
  left,
  right,
  platform = CURRENT_PLATFORM,
}: {
  left: TShortcut;
  right: TShortcut;
  platform?: EPlatform;
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

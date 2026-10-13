import { EPlatform } from '@/shared/platform/platform';

import type { TKeybinding } from './keymap.model';
import { matchesShortcut, normalizeShortcut } from './normalize-shortcut';

export type TKeybindingConflict = {
  first: TKeybinding;
  second: TKeybinding;
  platforms: EPlatform[];
};

export function findKeybindingConflicts(
  bindings: readonly TKeybinding[],
): TKeybindingConflict[] {
  const conflicts: TKeybindingConflict[] = [];
  for (const [index, first] of bindings.entries()) {
    for (const second of bindings.slice(index + 1)) {
      const overlaps =
        first.scope === undefined ||
        second.scope === undefined ||
        first.scope === second.scope;
      if (!overlaps) continue;
      const platforms = Object.values(EPlatform).filter((platform) =>
        matchesShortcut({
          left: first.shortcut,
          right: second.shortcut,
          platform,
        }),
      );
      if (platforms.length) {
        conflicts.push({ first, second, platforms });
      }
    }
  }
  return conflicts;
}

export function assertValidKeybindings(bindings: readonly TKeybinding[]): void {
  const conflicts = findKeybindingConflicts(bindings);
  if (!conflicts.length) return;

  throw new Error(
    `Invalid keybindings:\n${conflicts
      .flatMap(({ first, second, platforms }) =>
        platforms.map((platform) => {
          const shortcut = normalizeShortcut({
            shortcut: first.shortcut,
            platform,
          });
          const normalized = [
            shortcut.ctrlKey && 'Ctrl',
            shortcut.altKey && 'Alt',
            shortcut.shiftKey && 'Shift',
            shortcut.metaKey && 'Meta',
            shortcut.code,
          ]
            .filter(Boolean)
            .join('+');
          return `${platform}: ${first.command} (${first.scope ?? 'global'}) conflicts with ${second.command} (${second.scope ?? 'global'}): ${normalized}`;
        }),
      )
      .join('\n')}`,
  );
}

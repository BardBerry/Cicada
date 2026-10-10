import type { TShortcut } from './keymap.model';
import { normalizeShortcut } from './normalize-shortcut';
import { EShortcutPlatform, SHORTCUT_PLATFORM } from './shortcut-platform';

type TShortcutDisplayToken = {
  text: string;
  label: string;
};

export function formatShortcut({
  shortcut,
  platform = SHORTCUT_PLATFORM,
}: {
  shortcut: TShortcut;
  platform?: EShortcutPlatform;
}): { tokens: TShortcutDisplayToken[]; accessibleLabel: string } {
  const normalized = normalizeShortcut({ shortcut, platform });
  const isMac = platform === EShortcutPlatform.MacOS;
  const tokens: TShortcutDisplayToken[] = [];
  if (normalized.ctrlKey)
    tokens.push({ text: isMac ? '⌃' : 'Ctrl', label: 'Control' });
  if (normalized.altKey)
    tokens.push({ text: isMac ? '⌥' : 'Alt', label: isMac ? 'Option' : 'Alt' });
  if (normalized.shiftKey)
    tokens.push({ text: isMac ? '⇧' : 'Shift', label: 'Shift' });
  if (normalized.metaKey) {
    tokens.push(
      isMac
        ? { text: '⌘', label: 'Command' }
        : platform === EShortcutPlatform.Windows
          ? { text: 'Win', label: 'Windows' }
          : { text: 'Super', label: 'Super' },
    );
  }

  const specialKeys: Record<string, TShortcutDisplayToken> = {
    Enter: { text: '↵', label: 'Enter' },
    ArrowUp: { text: '↑', label: 'Up arrow' },
    ArrowDown: { text: '↓', label: 'Down arrow' },
    ArrowLeft: { text: '←', label: 'Left arrow' },
    ArrowRight: { text: '→', label: 'Right arrow' },
    Escape: { text: 'Esc', label: 'Escape' },
    Backspace: { text: isMac ? '⌫' : 'Backspace', label: 'Backspace' },
    Tab: { text: isMac ? '⇥' : 'Tab', label: 'Tab' },
    Space: { text: 'Space', label: 'Space' },
    Delete: { text: 'Del', label: 'Delete' },
    Insert: { text: 'Ins', label: 'Insert' },
    Home: { text: 'Home', label: 'Home' },
    End: { text: 'End', label: 'End' },
    PageUp: { text: 'PgUp', label: 'Page up' },
    PageDown: { text: 'PgDn', label: 'Page down' },
    CapsLock: { text: 'Caps', label: 'Caps Lock' },
    Comma: { text: ',', label: 'Comma' },
    Period: { text: '.', label: 'Period' },
    Slash: { text: '/', label: 'Slash' },
    Backslash: { text: '\\', label: 'Backslash' },
    Semicolon: { text: ';', label: 'Semicolon' },
    Quote: { text: "'", label: 'Quote' },
    Backquote: { text: '`', label: 'Backquote' },
    Minus: { text: '-', label: 'Minus' },
    Equal: { text: '=', label: 'Equals' },
    BracketLeft: { text: '[', label: 'Left bracket' },
    BracketRight: { text: ']', label: 'Right bracket' },
    NumpadEnter: { text: 'Num ↵', label: 'Numpad Enter' },
  };
  const code = normalized.code;
  const text = /^Key[A-Z]$/.test(code)
    ? code.slice(3)
    : /^Digit\d$/.test(code)
      ? code.slice(5)
      : /^Numpad\d$/.test(code)
        ? `Num ${code.slice(6)}`
        : code;
  tokens.push(
    specialKeys[code] ?? {
      text,
      label: /^Numpad\d$/.test(code) ? `Numpad ${code.slice(6)}` : text,
    },
  );
  return {
    tokens,
    accessibleLabel: tokens.map((token) => token.label).join(' + '),
  };
}

export enum EShortcutPlatform {
  MacOS = 'macOS',
  Windows = 'Windows',
  Linux = 'Linux',
}

export function detectShortcutPlatform(platform: string): EShortcutPlatform {
  if (/mac|darwin/i.test(platform)) return EShortcutPlatform.MacOS;
  if (/win/i.test(platform)) return EShortcutPlatform.Windows;
  return EShortcutPlatform.Linux;
}

export const SHORTCUT_PLATFORM = detectShortcutPlatform(
  typeof navigator === 'undefined'
    ? ''
    : navigator.platform || navigator.userAgent,
);

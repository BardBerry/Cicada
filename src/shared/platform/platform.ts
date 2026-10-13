export enum EPlatform {
  MacOS = 'macOS',
  Windows = 'Windows',
  Linux = 'Linux',
  Unknown = 'Unknown',
}

export function detectPlatform(platform: string): EPlatform {
  if (/mac|darwin/i.test(platform)) return EPlatform.MacOS;
  if (/win/i.test(platform)) return EPlatform.Windows;
  if (/linux/i.test(platform)) return EPlatform.Linux;
  return EPlatform.Unknown;
}

export const CURRENT_PLATFORM = detectPlatform(
  typeof navigator === 'undefined'
    ? ''
    : navigator.platform || navigator.userAgent,
);

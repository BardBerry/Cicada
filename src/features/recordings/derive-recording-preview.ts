import { reduceTypingRecording } from '@/features/typing/reduce-typing-recording';
import type { TTypingRecording } from '@/features/typing/typing-recording.model';

export function deriveRecordingPreview(recording: TTypingRecording): string {
  const state = reduceTypingRecording(recording);
  const text =
    state.captions.find((caption) => caption.trim().length > 0) ?? state.text;

  return Array.from(text.trim().replace(/\s+/gu, ' ')).slice(0, 120).join('');
}

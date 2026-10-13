import type { TCaptionLayout } from '@/features/captions/captions.model';
import type { TTypingRecording } from '@/features/typing/typing-recording.model';

export type TRecordingExportInput = {
  recording: TTypingRecording;
  layout: TCaptionLayout;
  frameCount: number;
};

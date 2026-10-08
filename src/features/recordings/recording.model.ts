import type { TTypingRecording } from '@/features/typing/typing-recording.model';

export type TRecordingSummary = {
  id: string;
  createdAt: string;
  name: string | null;
  preview: string;
  durationMs: number;
  eventCount: number;
};

export type TRecordingPayload = {
  id: string;
  createdAt: string;
  recording: TTypingRecording;
};

export type TLoadedRecording = {
  summary: TRecordingSummary;
  recording: TTypingRecording;
};

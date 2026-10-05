import type { TTypingRecording } from '@/features/typing/typing-recording.model';

export type TRecordingSummary = {
  id: string;
  name: string;
  createdAt: string;
  durationMs: number;
  eventCount: number;
};

export type TRecording = {
  id: string;
  createdAt: string;
  recording: TTypingRecording;
};

export type TProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  recordings: TRecordingSummary[];
};

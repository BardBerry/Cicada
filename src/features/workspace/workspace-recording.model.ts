import type { TTypingRecording } from '@/features/typing/typing-recording.model';

export enum EWorkspaceRecordingState {
  Temporary = 'temporary',
  Saved = 'saved',
}

export type TWorkspaceRecording = {
  id: string;
  createdAt: string;
  recording: TTypingRecording;
  state: EWorkspaceRecordingState;
};

export type TWorkspaceSaveAttempt = {
  id: string;
  recordingId: string;
  createdAt: string;
  name: string | null;
};

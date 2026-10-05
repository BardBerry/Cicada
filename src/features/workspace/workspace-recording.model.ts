import type { TTypingRecording } from '@/features/typing/typing-recording.model';

export type TWorkspaceRecording = {
  id: string;
  createdAt: string;
  recording: TTypingRecording;
  projectId: string | null;
  hasUnsavedChanges: boolean;
};

export type TWorkspaceSaveAttempt = {
  id: string;
  recordingId: string;
  createdAt: string;
  projectId: string;
  name: string;
};

import type {
  TLoadedRecording,
  TRecordingPayload,
  TRecordingSummary,
} from './recording.model';

export type TSaveRecordingParams = TRecordingPayload & { name?: string | null };

export type TRecordingStorage = {
  listRecordings(): Promise<TRecordingSummary[]>;
  loadRecording(id: string): Promise<TLoadedRecording>;
  saveRecording(params: TSaveRecordingParams): Promise<TRecordingSummary>;
  deleteRecording(id: string): Promise<{ cleanupWarning: string | null }>;
};

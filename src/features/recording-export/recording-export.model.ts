import type { TCaptionLayout } from '@/features/captions/captions.model';
import type { TTypingRecording } from '@/features/typing/typing-recording.model';

export enum EExportResolution {
  HD = '720p',
  FullHD = '1080p',
  QHD = '1440p',
  UHD = '4k',
}

export enum EExportFrameRate {
  FPS30 = 30,
  FPS60 = 60,
}

export enum EExportQuality {
  Standard = 'standard',
  High = 'high',
  Maximum = 'maximum',
}

export enum ERecordingExportPhase {
  Idle = 'idle',
  Rendering = 'rendering',
  Encoding = 'encoding',
  Complete = 'complete',
  Failed = 'failed',
}

export type TRecordingExportSettings = {
  resolution: EExportResolution;
  fps: EExportFrameRate;
  quality: EExportQuality;
  filename: string;
  directory: string;
};

export type TRecordingExportProgress = {
  phase: ERecordingExportPhase.Rendering | ERecordingExportPhase.Encoding;
  completedFrames: number;
  totalFrames: number;
};

export type TRecordingExportInput = {
  recording: TTypingRecording;
  layout: TCaptionLayout;
  settings: TRecordingExportSettings;
  frameCount: number;
};

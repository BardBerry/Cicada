import type { TProject, TRecording } from './project.model';

export type TDeleteRecordingResult = {
  cleanupWarning: string | null;
};

export type TSaveRecordingParams = {
  nextProject: TProject;
  recording: TRecording;
};

export type TLoadRecordingParams = {
  projectId: string;
  recordingId: string;
};

export type TDeleteRecordingParams = {
  nextProject: TProject;
  recordingId: string;
};

export type TProjectStorage = {
  createProject: (project: TProject) => Promise<void>;
  loadProject: (projectId: string) => Promise<TProject>;
  listProjects: () => Promise<TProject[]>;

  saveProject: (nextProject: TProject) => Promise<void>;

  saveRecording: (params: TSaveRecordingParams) => Promise<void>;

  loadRecording: (params: TLoadRecordingParams) => Promise<TRecording>;

  deleteRecording: (
    params: TDeleteRecordingParams,
  ) => Promise<TDeleteRecordingResult>;
};

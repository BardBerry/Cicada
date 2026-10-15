import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';

import type { TCaptionPosition } from '@/features/captions/captions.model';

import {
  EExportFrameRate,
  EExportQuality,
  EExportResolution,
  ERecordingExportPhase,
  type TRecordingExportInput,
  type TRecordingExportProgress,
} from './recording-export.model';

type TExportRecordingParams = Pick<
  TRecordingExportInput,
  'recording' | 'layout' | 'settings'
> & { sourceId?: string };

export const useRecordingExportStore = defineStore('recording-export', () => {
  const phase = ref<ERecordingExportPhase>(ERecordingExportPhase.Idle);
  const isExporting = computed(
    () =>
      phase.value === ERecordingExportPhase.Rendering ||
      phase.value === ERecordingExportPhase.Encoding,
  );
  const completedFrames = ref(0);
  const totalFrames = ref(0);
  const errorMessage = ref<string | null>(null);
  const lastExportPath = ref<string | null>(null);
  const failedConfiguration = ref<{
    sourceId: string;
    filename: string;
    position: TCaptionPosition;
  } | null>(null);
  const preferences = reactive<
    Omit<TRecordingExportInput['settings'], 'filename'>
  >({
    resolution: EExportResolution.FullHD,
    fps: EExportFrameRate.FPS30,
    quality: EExportQuality.High,
    directory: '',
  });

  async function initializeDirectory() {
    if (preferences.directory) return;
    const directory = await invoke<string>(
      'default_recording_export_directory',
    );
    if (!preferences.directory) preferences.directory = directory;
  }

  async function exportRecording({
    recording,
    layout,
    settings,
    sourceId,
  }: TExportRecordingParams): Promise<string | null> {
    if (isExporting.value) return null;
    phase.value = ERecordingExportPhase.Rendering;
    completedFrames.value = 0;
    totalFrames.value = 0;
    errorMessage.value = null;
    lastExportPath.value = null;
    let unlisten: UnlistenFn | undefined;
    const configuration = sourceId
      ? {
          sourceId,
          filename: settings.filename,
          position: { ...layout.position },
        }
      : null;
    try {
      // Own the request before awaiting; export must not follow later Workspace
      // replacement, replay changes, or mutable appearance settings.
      const snapshot = {
        recording: {
          durationMs: recording.durationMs,
          events: recording.events.map(({ elapsedMs, event }) => ({
            elapsedMs,
            event: { ...event },
          })),
        },
        layout: { ...layout, position: { ...layout.position } },
        settings: { ...settings },
      };
      unlisten = await listen<TRecordingExportProgress>(
        'recording-export-progress',
        ({ payload }) => {
          if (!isExporting.value) return;
          phase.value = payload.phase;
          completedFrames.value = payload.completedFrames;
          totalFrames.value = payload.totalFrames;
        },
      );
      const path = await invoke<string>('export_recording', snapshot);
      lastExportPath.value = path;
      failedConfiguration.value = null;
      completedFrames.value = totalFrames.value;
      phase.value = ERecordingExportPhase.Complete;
      return path;
    } catch (error) {
      errorMessage.value = `Unable to export MP4: ${error instanceof Error ? error.message : String(error)}`;
      phase.value = ERecordingExportPhase.Failed;
      failedConfiguration.value = configuration;
      completedFrames.value = 0;
      totalFrames.value = 0;
      return null;
    } finally {
      unlisten?.();
    }
  }

  return {
    isExporting,
    phase,
    completedFrames,
    totalFrames,
    errorMessage,
    lastExportPath,
    failedConfiguration,
    preferences,
    initializeDirectory,
    exportRecording,
  };
});

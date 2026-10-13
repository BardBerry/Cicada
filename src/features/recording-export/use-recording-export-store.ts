import { invoke } from '@tauri-apps/api/core';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { TRecordingExportInput } from './recording-export.model';

type TExportRecordingParams = Pick<
  TRecordingExportInput,
  'recording' | 'layout'
>;

export const useRecordingExportStore = defineStore('recording-export', () => {
  const isExporting = ref(false);
  const errorMessage = ref<string | null>(null);
  const lastExportPath = ref<string | null>(null);

  async function exportRecording({
    recording,
    layout,
  }: TExportRecordingParams): Promise<string | null> {
    if (isExporting.value) return null;
    isExporting.value = true;
    errorMessage.value = null;
    lastExportPath.value = null;
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
      };
      const path = await invoke<string>('export_recording', snapshot);
      lastExportPath.value = path;
      return path;
    } catch (error) {
      errorMessage.value = `Unable to export MP4: ${error instanceof Error ? error.message : String(error)}`;
      return null;
    } finally {
      isExporting.value = false;
    }
  }

  return { isExporting, errorMessage, lastExportPath, exportRecording };
});

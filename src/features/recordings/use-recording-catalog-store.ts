import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { TLoadedRecording, TRecordingSummary } from './recording.model';
import { compareRecordingSummaries } from './recording-consistency';
import { type TSaveRecordingParams } from './recording-storage';
import { tauriRecordingStorage } from './tauri-recording-storage';

export const useRecordingCatalogStore = defineStore('recording-catalog', () => {
  const recordings = ref<TRecordingSummary[]>([]);
  const isBusy = ref(false);
  const errorMessage = ref<string | null>(null);
  const warningMessage = ref<string | null>(null);

  async function listRecordings(): Promise<TRecordingSummary[] | null> {
    if (!beginOperation()) return null;

    try {
      const loaded = await tauriRecordingStorage.listRecordings();
      recordings.value = loaded.map((summary) => ({ ...summary }));
      return loaded;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to list recordings', error);
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function loadRecording(id: string): Promise<TLoadedRecording | null> {
    if (!beginOperation()) return null;

    try {
      const loaded = await tauriRecordingStorage.loadRecording(id);
      upsertSummary(loaded.summary);
      return loaded;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to load recording', error);
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function saveRecording(
    params: TSaveRecordingParams,
  ): Promise<TRecordingSummary | null> {
    if (!beginOperation()) return null;

    try {
      const summary = await tauriRecordingStorage.saveRecording(params);
      upsertSummary(summary);
      return summary;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to save recording', error);
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function deleteRecording(id: string): Promise<boolean> {
    if (!beginOperation()) return false;

    try {
      const result = await tauriRecordingStorage.deleteRecording(id);
      recordings.value = recordings.value.filter((item) => item.id !== id);
      warningMessage.value = result.cleanupWarning;
      return true;
    } catch (error) {
      errorMessage.value = getErrorMessage('Unable to delete recording', error);
      return false;
    } finally {
      isBusy.value = false;
    }
  }

  function beginOperation(): boolean {
    if (isBusy.value) return false;

    clearMessages();
    isBusy.value = true;
    return true;
  }

  function upsertSummary(summary: TRecordingSummary): void {
    recordings.value = [
      ...recordings.value.filter((item) => item.id !== summary.id),
      { ...summary },
    ].sort(compareRecordingSummaries);
  }

  function clearMessages(): void {
    errorMessage.value = null;
    warningMessage.value = null;
  }

  return {
    recordings,
    isBusy,
    errorMessage,
    warningMessage,
    listRecordings,
    loadRecording,
    saveRecording,
    deleteRecording,
    clearMessages,
  };
});

function getErrorMessage(context: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${context}: ${message}`;
}

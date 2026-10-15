<script setup lang="ts">
import { FolderOpenIcon } from '@lucide/vue';
import { open as selectDirectory } from '@tauri-apps/plugin-dialog';
import { computed, onMounted, ref, toRef } from 'vue';

import type { TCaptionLayout } from '@/features/captions/captions.model';
import type { TTypingRecording } from '@/features/typing/typing-recording.model';
import UiButton from '@/shared/ui/ui-button.vue';
import UiDialog from '@/shared/ui/ui-dialog.vue';
import UiInput from '@/shared/ui/ui-input.vue';
import UiSelect from '@/shared/ui/ui-select.vue';

import {
  EExportFrameRate,
  EExportQuality,
  EExportResolution,
} from './recording-export.model';
import { useRecordingExportStore } from './use-recording-export-store';

type TProps = {
  sourceLabel: string;
  recording: TTypingRecording;
  layout: TCaptionLayout;
};

const props = defineProps<TProps>();
const open = defineModel<boolean>('open', { default: false });
const store = useRecordingExportStore();
const filename = toRef(store.preferences, 'filename');
const errorMessage = ref<string | null>(null);
const browsing = ref(false);
const filenameError = computed(() => {
  const stem = filename.value.trim().replace(/\.mp4$/i, '');
  if (!stem) return 'Enter a file name.';
  if (new TextEncoder().encode(stem).length > 180)
    return 'File name is too long (maximum 180 UTF-8 bytes).';
  if (
    stem.trim() !== stem ||
    stem === '.' ||
    stem === '..' ||
    stem.endsWith('.') ||
    /[/\\:]/.test(stem) ||
    [...stem].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || (code >= 127 && code <= 159);
    })
  )
    return 'Use a file name without path separators, control characters, or trailing dots/spaces.';
  return null;
});
const fps = computed({
  get: () => String(store.preferences.fps),
  set: (value: string) => {
    store.preferences.fps =
      value === String(EExportFrameRate.FPS60)
        ? EExportFrameRate.FPS60
        : EExportFrameRate.FPS30;
  },
});
const resolutionOptions = [
  { value: EExportResolution.HD, label: '720p · 1280 × 720' },
  { value: EExportResolution.FullHD, label: '1080p · 1920 × 1080' },
  { value: EExportResolution.QHD, label: '1440p · 2560 × 1440' },
  { value: EExportResolution.UHD, label: '4K · 3840 × 2160' },
];
const fpsOptions = [
  { value: String(EExportFrameRate.FPS30), label: '30 FPS' },
  { value: String(EExportFrameRate.FPS60), label: '60 FPS' },
];
const qualityOptions = [
  { value: EExportQuality.Standard, label: 'Standard · CRF 23' },
  { value: EExportQuality.High, label: 'High · CRF 18' },
  { value: EExportQuality.Maximum, label: 'Maximum · CRF 14' },
];

async function browse() {
  browsing.value = true;
  errorMessage.value = null;
  try {
    const directory = await selectDirectory({
      directory: true,
      multiple: false,
      title: 'Export Video to',
      defaultPath: store.preferences.directory || undefined,
    });
    if (typeof directory === 'string') store.preferences.directory = directory;
  } catch (error) {
    errorMessage.value = `Unable to select a directory: ${String(error)}`;
  } finally {
    browsing.value = false;
  }
}

function exportRecording() {
  if (
    filenameError.value ||
    !store.preferences.directory.trim() ||
    browsing.value ||
    store.isExporting
  )
    return;
  open.value = false;
  void store.exportRecording({
    recording: props.recording,
    layout: props.layout,
    settings: { ...store.preferences, filename: filename.value.trim() },
  });
}

onMounted(async () => {
  try {
    await store.initializeDirectory();
  } catch (error) {
    errorMessage.value = `Choose an output directory: ${String(error)}`;
  }
});
</script>

<template>
  <UiDialog
    v-model:open="open"
    class="recording-export-dialog"
    style="width: min(480px, calc(100vw - 2 * var(--space-4)))"
    title="Export Video"
    :description="`${props.sourceLabel} · H.264 video · No audio`"
    :dismiss-on-outside="false"
  >
    <form
      id="recording-export-form"
      class="form"
      @submit.prevent="exportRecording"
    >
      <p class="note">Exports the Video Frame layout.</p>
      <div class="settings">
        <label class="field">
          <span>Resolution</span>
          <UiSelect
            :model-value="store.preferences.resolution"
            :options="resolutionOptions"
            v-bind="{ ariaLabel: 'Resolution' }"
            @update:model-value="
              store.preferences.resolution = $event as EExportResolution
            "
          />
        </label>
        <label class="field">
          <span>Frame rate</span>
          <UiSelect
            v-model="fps"
            :options="fpsOptions"
            v-bind="{ ariaLabel: 'Frame rate' }"
          />
        </label>
        <label class="field">
          <span>Quality</span>
          <UiSelect
            :model-value="store.preferences.quality"
            :options="qualityOptions"
            v-bind="{ ariaLabel: 'Quality' }"
            @update:model-value="
              store.preferences.quality = $event as EExportQuality
            "
          />
        </label>
        <label class="field">
          <span>File name</span>
          <div class="filename">
            <UiInput
              v-model="filename"
              class="filename-input"
              aria-label="File name"
              :aria-invalid="Boolean(filenameError)"
              :aria-describedby="
                filenameError ? 'export-filename-error' : undefined
              "
              required
            />
            <span
              v-if="!filename.trim().toLowerCase().endsWith('.mp4')"
              class="extension"
              >.mp4</span
            >
          </div>
          <span
            v-if="filenameError"
            id="export-filename-error"
            class="note"
            role="alert"
            >{{ filenameError }}</span
          >
        </label>
        <div class="field">
          <label for="export-directory">Save to</label>
          <div class="destination">
            <UiInput
              id="export-directory"
              v-model="store.preferences.directory"
              class="directory-input"
              aria-label="Save to"
              placeholder="Choose a save folder"
              :disabled="browsing"
              required
            />
            <UiButton
              class="directory-button"
              size="icon"
              :icon="FolderOpenIcon"
              :disabled="browsing"
              aria-label="Choose save folder"
              title="Choose save folder"
              @click="browse"
            />
          </div>
        </div>
      </div>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    </form>
    <template #actions>
      <div class="export-actions">
        <UiButton class="cancel" @click="open = false">Cancel</UiButton>
        <UiButton
          variant="primary"
          type="submit"
          form="recording-export-form"
          :disabled="
            Boolean(filenameError) ||
            !store.preferences.directory.trim() ||
            browsing ||
            store.isExporting
          "
          >Export</UiButton
        >
      </div>
    </template>
  </UiDialog>
</template>

<style scoped>
.form {
  display: grid;
  align-items: start;
  gap: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--app-border);
}
.settings {
  display: grid;
  min-width: 0;
  gap: var(--space-4);
}
.field {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  color: var(--app-muted);
  font-weight: var(--font-weight-medium);
}
.filename,
.destination {
  position: relative;
}
.filename-input,
.directory-input {
  padding-right: calc(var(--control-size-md) + var(--space-2));
}
.extension {
  position: absolute;
  top: 50%;
  right: var(--space-3);
  transform: translateY(-50%);
  pointer-events: none;
}
.extension,
.note {
  color: var(--app-muted);
  font-weight: normal;
}
.directory-input {
  color: var(--app-muted);
  font-size: var(--font-size-sm);
  font-weight: normal;
}
.directory-button {
  --ui-button-secondary-background: transparent;

  position: absolute;
  top: 0;
  right: 0;
}
.note {
  margin: 0;
  font-size: var(--font-size-sm);
}
.error {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--app-text);
}
.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  width: 100%;
  padding-top: var(--space-4);
  border-top: 1px solid var(--app-border);
}
.cancel {
  border: 1px solid var(--app-border);
}
</style>

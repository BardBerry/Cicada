<script setup lang="ts">
import { FolderOpenIcon } from '@lucide/vue';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { computed, ref, watch } from 'vue';

import UiButton from '@/shared/ui/ui-button.vue';
import { UI_LOCAL_KEYBOARD_SCOPE_ATTRS } from '@/shared/ui/ui-keyboard-scope';

import { ERecordingExportPhase } from './recording-export.model';
import { useRecordingExportStore } from './use-recording-export-store';

const store = useRecordingExportStore();
const revealError = ref<string | null>(null);
const percent = computed(() =>
  store.totalFrames
    ? Math.round((store.completedFrames / store.totalFrames) * 100)
    : 0,
);
const filename = computed(() => store.lastExportPath?.split('/').pop());

watch(
  () => store.lastExportPath,
  () => {
    revealError.value = null;
  },
);

async function reveal() {
  if (!store.lastExportPath) return;
  try {
    await revealItemInDir(store.lastExportPath);
  } catch (error) {
    revealError.value = `Unable to reveal the file: ${String(error)}`;
  }
}
</script>

<template>
  <section
    v-if="store.phase !== ERecordingExportPhase.Idle"
    class="recording-export-status"
    aria-label="MP4 export status"
    v-bind="UI_LOCAL_KEYBOARD_SCOPE_ATTRS"
  >
    <template v-if="store.isExporting">
      <div class="heading" role="status">
        <strong>{{
          store.phase === ERecordingExportPhase.Rendering
            ? 'Rendering frames'
            : 'Encoding video'
        }}</strong>
        <span v-if="store.phase === ERecordingExportPhase.Rendering"
          >{{ percent }}%</span
        >
      </div>
      <progress
        class="progress"
        :value="
          store.phase === ERecordingExportPhase.Rendering
            ? store.completedFrames
            : undefined
        "
        :max="store.totalFrames || 1"
        :aria-label="
          store.phase === ERecordingExportPhase.Rendering
            ? 'Rendering frames'
            : 'Encoding video'
        "
      />
      <p class="detail">You can keep using Cicada while the export finishes.</p>
    </template>
    <template v-else-if="store.phase === ERecordingExportPhase.Complete">
      <strong role="status">Export complete</strong>
      <p class="filename" :title="store.lastExportPath ?? undefined">
        {{ filename }}
      </p>
      <UiButton :icon="FolderOpenIcon" @click="reveal"
        >Reveal in Finder</UiButton
      >
      <p v-if="revealError" class="detail" role="alert">{{ revealError }}</p>
    </template>
    <template v-else>
      <strong>Export failed</strong>
      <p class="detail" role="alert">{{ store.errorMessage }}</p>
    </template>
  </section>
</template>

<style scoped>
.recording-export-status {
  position: absolute;
  right: var(--shell-inset);
  bottom: var(--shell-inset);
  z-index: var(--z-index-2);
  width: min(340px, calc(100% - 2 * var(--shell-inset)));
  padding: var(--space-3);
  background: var(--app-background);
  color: var(--app-text);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgb(0 0 0 / 8%);
}
.heading {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}
.progress {
  display: block;
  width: 100%;
  height: 6px;
  margin-top: var(--space-3);
  accent-color: var(--app-accent);
}
.detail {
  margin: var(--space-2) 0 0;
  color: var(--app-muted);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}
.filename {
  margin: var(--space-2) 0;
  overflow-wrap: anywhere;
  font-size: var(--font-size-sm);
}
</style>

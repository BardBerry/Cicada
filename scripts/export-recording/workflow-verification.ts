import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { nextTick } from 'vue';

import { router } from '../../src/app/router/router';
import { useCaptionLayoutStore } from '../../src/features/captions/use-caption-layout-store';
import {
  EExportFrameRate,
  EExportQuality,
  EExportResolution,
  ERecordingExportPhase,
} from '../../src/features/recording-export/recording-export.model';
import { useRecordingExportStore } from '../../src/features/recording-export/use-recording-export-store';
import { useRecordingCatalogStore } from '../../src/features/recordings/use-recording-catalog-store';
import { useTypingSessionStore } from '../../src/features/typing/use-typing-session-store';
import { useRecordingWorkspaceStore } from '../../src/features/workspace/use-recording-workspace-store';
import { EWorkspaceRecordingState } from '../../src/features/workspace/workspace-recording.model';

async function waitFor<T>(
  read: () => T,
  label: string,
): Promise<NonNullable<T>> {
  const deadline = performance.now() + 90000;
  while (performance.now() < deadline) {
    const value = read();
    if (value) return value as NonNullable<T>;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out: ${label}`);
}
function key(target: EventTarget, key: string, code = key, metaKey = false) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      code,
      metaKey,
      bubbles: true,
      cancelable: true,
    }),
  );
}
async function command(id: string, search: string) {
  key(window, 'k', 'KeyK', true);
  const input = await waitFor(
    () => document.querySelector<HTMLInputElement>('.command-palette input'),
    'palette',
  );
  input.value = search;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  const row = await waitFor(
    () => document.querySelector<HTMLElement>(`[data-command="${id}"]`),
    id,
  );
  if (
    row.getAttribute('aria-disabled') === 'true' ||
    row.hasAttribute('data-disabled')
  )
    throw new Error(`Disabled: ${id}`);
  row.click();
  await waitFor(
    () => !document.querySelector('.command-palette'),
    'palette close',
  );
}
async function openExport() {
  await command('recording.export', 'Export MP4');
  const dialog = await waitFor(
    () => document.querySelector<HTMLElement>('.recording-export-dialog'),
    'dialog',
  );
  await waitFor(
    () => useRecordingExportStore().preferences.directory,
    'default directory',
  );
  await waitFor(() => {
    const composition = dialog.querySelector<HTMLElement>('.composition');
    return composition && composition.getBoundingClientRect().width > 0;
  }, 'preview scale');
  if (useRecordingExportStore().isExporting)
    throw new Error('Opening dialog started export');
  return dialog;
}
function submit() {
  document
    .querySelector<HTMLButtonElement>(
      'button[form="recording-export-form"][type="submit"]',
    )!
    .click();
}
function previewMetrics(dialog: HTMLElement) {
  const composition = dialog.querySelector<HTMLElement>('.composition')!;
  const bounds = composition.getBoundingClientRect();
  const scale = bounds.width / 1920;
  return [...composition.querySelectorAll<HTMLElement>('.item')].map((item) => {
    const range = document.createRange();
    const text = item.querySelector('.text')!;
    range.selectNodeContents(text);
    const rect = item.getBoundingClientRect();
    return {
      text: text.textContent,
      rect: [
        (rect.x - bounds.x) / scale,
        (rect.y - bounds.y) / scale,
        rect.width / scale,
        rect.height / scale,
      ],
      lines: [...range.getClientRects()].map((line) => [
        (line.x - bounds.x) / scale,
        (line.y - bounds.y) / scale,
        line.width / scale,
        line.height / scale,
      ]),
      transform: getComputedStyle(item).transform,
    };
  });
}
type TMetrics = ReturnType<typeof previewMetrics>;
type TRenderSummary = {
  appliedEventCount: number;
  maxItems: number;
  finalItems: number;
  animationUpdates: number;
  layoutMetrics: {
    viewport: number[];
    laneWidth: number;
    gap: string;
    items: TMetrics;
  };
};
const results: Record<string, unknown> = {};
try {
  await router.isReady();
  await nextTick();
  const catalog = useRecordingCatalogStore();
  const workspace = useRecordingWorkspaceStore();
  const typing = useTypingSessionStore();
  const exporter = useRecordingExportStore();
  const captions = useCaptionLayoutStore();
  const loaded = await catalog.loadRecording(
    '1fc0c0e1-8198-4995-9ec2-fe6ed9e5e97d',
  );
  if (!loaded)
    throw new Error(catalog.errorMessage ?? 'Missing saved recording');
  workspace.replaceRecording({
    expectedRecordingId: null,
    expectedGeneration: workspace.workspaceGeneration,
    nextRecording: {
      id: loaded.summary.id,
      createdAt: loaded.summary.createdAt,
      recording: loaded.recording,
      state: EWorkspaceRecordingState.Saved,
    },
  });
  typing.showRecording(loaded.recording);
  const original = JSON.stringify(workspace.workspaceRecording);
  const originalLayout = JSON.stringify(captions.layout);
  const summaries: TRenderSummary[] = [];
  const progress: unknown[] = [];
  const detachSummary = await listen<TRenderSummary>(
    'recording-export-verification',
    ({ payload }) => summaries.push(payload),
  );
  const detachProgress = await listen(
    'recording-export-progress',
    ({ payload }) => progress.push(payload),
  );
  let dialog = await openExport();
  // Exercise Reka's actual popover and keyboard selection in the native WebView.
  key(
    dialog.querySelector<HTMLElement>('[aria-label="Resolution"]')!,
    'ArrowDown',
  );
  const option = await waitFor(
    () =>
      [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
        (item) => item.textContent?.includes(EExportResolution.HD),
      ),
    '720p option',
  );
  key(option, 'Enter');
  await waitFor(
    () => exporter.preferences.resolution === EExportResolution.HD,
    'resolution selection',
  );
  const preview = dialog.querySelector<HTMLElement>(
    '.recording-export-preview',
  )!;
  key(preview, 'ArrowRight');
  key(preview, 'ArrowDown');
  await nextTick();
  if (JSON.stringify(captions.layout) !== originalLayout)
    throw new Error('Placement mutated Studio');
  [...dialog.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.trim() === 'Cancel')!
    .click();
  await waitFor(
    () => !document.querySelector('.recording-export-dialog'),
    'cancel',
  );
  if (
    exporter.isExporting ||
    JSON.stringify(workspace.workspaceRecording) !== original
  )
    throw new Error('Cancel mutated Workspace or exported');
  results.dialogCancelUnchanged = true;
  results.settingsRemembered =
    exporter.preferences.resolution === EExportResolution.HD;
  exporter.preferences.resolution = EExportResolution.FullHD;
  dialog = await openExport();
  const frame = dialog.querySelector<HTMLElement>('.recording-export-preview')!;
  // Synthetic pointer events need capture bypassed; real pointer capture is native.
  const capture = frame.setPointerCapture;
  frame.setPointerCapture = () => {};
  const frameRect = frame.getBoundingClientRect();
  frame.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 1,
      button: 0,
      clientX: frameRect.x + 10,
      clientY: frameRect.y + 10,
      bubbles: true,
    }),
  );
  frame.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerId: 1,
      clientX: frameRect.x + 10 + frameRect.width * 0.1,
      clientY: frameRect.y + 10 + frameRect.height * 0.15,
      bubbles: true,
    }),
  );
  frame.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: 1, bubbles: true }),
  );
  frame.setPointerCapture = capture;
  await nextTick();
  const metrics = previewMetrics(dialog);
  results.previewMetrics = metrics;
  const filename = dialog.querySelector<HTMLInputElement>(
    '[aria-label="File name"]',
  )!;
  filename.value = String.fromCodePoint(0x4e2d).repeat(61);
  filename.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  if (
    !document.querySelector<HTMLButtonElement>(
      'button[form="recording-export-form"]',
    )!.disabled ||
    !document
      .querySelector('#export-filename-error')
      ?.textContent?.includes('UTF-8')
  )
    throw new Error('Filename byte limit was not checked inline');
  results.filenameByteLimitValidated = true;
  filename.value = `workflow-${Date.now()}-saved`;
  filename.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  submit();
  await waitFor(
    () => !document.querySelector('.recording-export-dialog'),
    'submit closes dialog',
  );
  const mode = (window as Window & { cicadaNativeVerificationMode?: string })
    .cicadaNativeVerificationMode;
  if (mode === 'error') {
    await waitFor(
      () => exporter.phase === ERecordingExportPhase.Failed,
      'FFmpeg failure',
    );
    if (
      exporter.isExporting ||
      exporter.completedFrames ||
      exporter.totalFrames ||
      !exporter.errorMessage?.includes('FFmpeg')
    )
      throw new Error('FFmpeg failure did not reset status');
    results.ffmpegFailure = exporter.errorMessage;
    results.workspaceUnchanged =
      JSON.stringify(workspace.workspaceRecording) === original;
    const retry = await openExport();
    if (
      retry.querySelector<HTMLInputElement>('[aria-label="File name"]')!
        .value !== filename.value ||
      previewMetrics(retry).some((item, index) =>
        item.rect.some(
          (value, axis) => Math.abs(value - metrics[index].rect[axis]) > 0.01,
        ),
      )
    )
      throw new Error('Failed filename/placement not retained for retry');
    results.failedConfigurationRetained = true;
  } else {
    await waitFor(() => exporter.isExporting, 'background admission');
    await router.push('/settings');
    await waitFor(
      () => document.querySelector('.recording-export-status progress'),
      'global progress after navigation',
    );
    await waitFor(() => !exporter.isExporting, 'saved export complete');
    if (
      !exporter.lastExportPath ||
      exporter.phase !== ERecordingExportPhase.Complete
    )
      throw new Error(exporter.errorMessage ?? 'No saved output');
    results.savedPath = exporter.lastExportPath;
    results.savedSummary = summaries[0];
    const actual = summaries[0].layoutMetrics.items;
    if (
      actual.length !== metrics.length ||
      actual.some(
        (item, index) =>
          item.text !== metrics[index].text ||
          item.lines.length !== metrics[index].lines.length ||
          item.rect.some(
            (value, axis) => Math.abs(value - metrics[index].rect[axis]) > 1,
          ),
      )
    )
      throw new Error('Preview and output geometry differ');
    results.previewMatchesOutput = true;
    if (
      JSON.stringify(workspace.workspaceRecording) !== original ||
      JSON.stringify(captions.layout) !== originalLayout
    )
      throw new Error('Saved export mutated Workspace/layout');
    results.navigationAndWorkspaceUnchanged = true;
    await router.push('/');
    await command('replay.start', 'Replay Recording');
    const startTime = performance.now();
    const short = {
      durationMs: 5000,
      events: loaded.recording.events.filter(
        ({ elapsedMs }) => elapsedMs <= 5000,
      ),
    };
    const settings = {
      ...exporter.preferences,
      resolution: EExportResolution.HD,
      fps: EExportFrameRate.FPS60,
      filename: `workflow-${Date.now()}-repeat`,
    };
    const repeated = await exporter.exportRecording({
      recording: short,
      layout: captions.layout,
      settings,
    });
    if (!repeated || !typing.isReplaying || performance.now() - startTime < 100)
      throw new Error(
        exporter.errorMessage ?? 'Replay/export isolation failed',
      );
    results.repeatPath = repeated;
    results.replayUnaffected = true;
    await command('replay.stop', 'Stop Replay');
    await exporter.exportRecording({
      recording: short,
      layout: captions.layout,
      settings,
    });
    if (
      useRecordingExportStore().phase !== ERecordingExportPhase.Failed ||
      exporter.isExporting ||
      exporter.totalFrames ||
      !exporter.errorMessage?.includes('already exists')
    )
      throw new Error('Collision did not fail safely');
    results.collisionRejected = true;
    await command('recording.new-session', 'New session');
    await command('recording.start', 'Start Recording');
    const input = await waitFor(
      () =>
        document.querySelector<HTMLTextAreaElement>(
          '.typing-surface:not(:disabled)',
        ),
      'draft input',
    );
    input.value =
      'This unsaved draft has a long caption that wraps onto another line in the fixed logical export frame.';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 400));
    key(input, 'Enter');
    await nextTick();
    input.value = 'Draft active caption';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await command('recording.stop', 'Stop Recording');
    const draft = JSON.stringify(workspace.workspaceRecording);
    if (
      workspace.workspaceRecording?.state !== EWorkspaceRecordingState.Temporary
    )
      throw new Error('Draft not staged');
    exporter.preferences.resolution = EExportResolution.UHD;
    exporter.preferences.fps = EExportFrameRate.FPS30;
    exporter.preferences.quality = EExportQuality.Maximum;
    dialog = await openExport();
    const draftMetrics = previewMetrics(dialog);
    submit();
    await waitFor(() => !exporter.isExporting, 'draft completion');
    if (
      !exporter.lastExportPath ||
      exporter.phase !== ERecordingExportPhase.Complete ||
      JSON.stringify(workspace.workspaceRecording) !== draft
    )
      throw new Error(exporter.errorMessage ?? 'Draft mutated/failed');
    results.draftPath = exporter.lastExportPath;
    results.draftDurationMs =
      workspace.workspaceRecording?.recording.durationMs;
    results.draftPreviewMetrics = draftMetrics;
    results.draftSummary = summaries[summaries.length - 1];
    results.recoveredAfterError = true;
    const reloaded = await catalog.loadRecording(loaded.summary.id);
    if (
      JSON.stringify(reloaded?.recording) !== JSON.stringify(loaded.recording)
    )
      throw new Error('Saved recording file changed');
    results.savedDataUnchanged = true;
  }
  results.progress = progress;
  detachSummary();
  detachProgress();
  await invoke('export_verification_report', { result: results });
} catch (error) {
  await invoke('export_verification_report', {
    result: { ...results, verificationFailure: String(error) },
  });
}

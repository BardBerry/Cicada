import { invoke } from '@tauri-apps/api/core';
import { nextTick } from 'vue';

import { useRecordingExportStore } from '@/features/recording-export/use-recording-export-store';

import { router } from '../../src/app/router/router';
import { useTypingSessionStore } from '../../src/features/typing/use-typing-session-store';
import { useRecordingWorkspaceStore } from '../../src/features/workspace/use-recording-workspace-store';

// Runs inside the actual Tauri main WebView, only with the opt-in Cargo feature.
async function waitFor<T>(
  read: () => T,
  label: string,
): Promise<NonNullable<T>> {
  const deadline = performance.now() + 240000;
  while (performance.now() < deadline) {
    const value = read();
    if (value) return value as NonNullable<T>;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function key(target: EventTarget, key: string, code: string, metaKey = false) {
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

async function palette(search: string) {
  key(window, 'k', 'KeyK', true);
  const input = await waitFor(
    () =>
      document.querySelector<HTMLInputElement>(
        '.command-palette input[aria-label="Search commands"]',
      ),
    'palette',
  );
  input.value = search;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
}

async function command(id: string, search: string) {
  await palette(search);
  const row = await waitFor(
    () => document.querySelector<HTMLElement>(`[data-command="${id}"]`),
    id,
  );
  if (
    row.getAttribute('aria-disabled') === 'true' ||
    row.hasAttribute('data-disabled')
  )
    throw new Error(`Command disabled: ${row.textContent}`);
  row.click();
  await waitFor(
    () => !document.querySelector('.command-palette'),
    'palette dismissal',
  );
}

async function disabledExport(search: string) {
  await palette('Export MP4');
  const row = await waitFor(
    () =>
      document.querySelector<HTMLElement>('[data-command="recording.export"]'),
    'export command',
  );
  if (
    !(
      row.getAttribute('aria-disabled') === 'true' ||
      row.hasAttribute('data-disabled')
    ) ||
    !row.textContent?.includes(search)
  ) {
    throw new Error(`Unexpected export availability: ${row.outerHTML}`);
  }
  key(document.activeElement ?? window, 'Escape', 'Escape');
  await waitFor(
    () => !document.querySelector('.command-palette'),
    'palette dismissal',
  );
}

async function startExport() {
  await command('recording.export', 'Export MP4');
  const button = await waitFor(
    () =>
      document.querySelector<HTMLButtonElement>(
        'button[type="submit"][form="recording-export-form"]:not(:disabled)',
      ),
    'export dialog',
  );
  if (useRecordingExportStore().isExporting)
    throw new Error('Opening dialog started export');
  button.click();
}

try {
  await router.isReady();
  await nextTick();
  const workspace = useRecordingWorkspaceStore();
  const typing = useTypingSessionStore();
  const exporter = useRecordingExportStore();
  const mode = (window as Window & { cicadaNativeVerificationMode?: string })
    .cicadaNativeVerificationMode;
  const paths: string[] = [];
  await disabledExport('No recording loaded');
  await command('recording.open', 'Open Recording');
  const saved = await waitFor(
    () =>
      document.querySelector<HTMLElement>(
        '[data-recording="1fc0c0e1-8198-4995-9ec2-fe6ed9e5e97d"]',
      ),
    'saved recording picker row',
  );
  saved.click();
  await waitFor(
    () => workspace.workspaceRecording?.state === 'saved',
    'saved workspace',
  );
  const original = JSON.stringify(workspace.workspaceRecording);
  const preview = JSON.stringify(typing.session);
  await startExport();

  if (mode === 'error') {
    await waitFor(() => exporter.errorMessage, 'export error');
    if (
      exporter.isExporting ||
      exporter.lastExportPath ||
      !document
        .querySelector('.recording-export-status [role="alert"]')
        ?.textContent?.includes('FFmpeg')
    )
      throw new Error('Export error was not reported/settled');
    await invoke('export_verification_report', {
      result: {
        errorReported: exporter.errorMessage,
        workspaceUnchanged:
          JSON.stringify(workspace.workspaceRecording) === original,
      },
    });
  } else {
    await waitFor(() => exporter.isExporting, 'export admission');
    await disabledExport('Export already running');
    await waitFor(() => !exporter.isExporting, 'first export');
    if (!exporter.lastExportPath || exporter.errorMessage)
      throw new Error(exporter.errorMessage ?? 'No export path');
    paths.push(exporter.lastExportPath);
    if (
      JSON.stringify(workspace.workspaceRecording) !== original ||
      JSON.stringify(typing.session) !== preview
    )
      throw new Error('Export changed workspace or static preview');
    if (
      !document
        .querySelector('.recording-export-status .filename')
        ?.getAttribute('title')
        ?.includes(exporter.lastExportPath)
    )
      throw new Error('Export path was not displayed');

    await command('replay.start', 'Replay Recording');
    await waitFor(() => typing.isReplaying, 'normal replay');
    const mainTime = performance.now();
    await startExport();
    await waitFor(() => exporter.isExporting, 'second export');
    await waitFor(() => !exporter.isExporting, 'second export completion');
    if (!exporter.lastExportPath || exporter.errorMessage)
      throw new Error(exporter.errorMessage ?? 'No repeated export path');
    paths.push(exporter.lastExportPath);
    if (
      !typing.isReplaying ||
      performance.now() - mainTime < 1000 ||
      typing.session.captions.length === 0
    )
      throw new Error('Export interfered with normal replay/clock');
    if (
      JSON.stringify(workspace.workspaceRecording) !== original ||
      paths[0] === paths[1]
    )
      throw new Error('Repeated export changed workspace or reused path');
    await command('replay.stop', 'Stop Replay');
    await command('recording.new-session', 'New session');
    await waitFor(() => !workspace.workspaceRecording, 'unloaded workspace');
    await command('recording.start', 'Start Recording');
    await waitFor(() => typing.isRecording, 'draft capture');
    await disabledExport('Finish recording first');
    const textarea = await waitFor(
      () =>
        document.querySelector<HTMLTextAreaElement>(
          '.typing-surface:not(:disabled)',
        ),
      'live input',
    );
    textarea.value = 'Unsaved draft export';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    key(textarea, 'Enter', 'Enter');
    await nextTick();
    textarea.value = 'Still unsaved';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    await waitFor(() => {
      const active = document.querySelector('.caption-canvas .anchor > .item');
      return active && getComputedStyle(active).opacity === '1';
    }, 'draft caption animation');
    await command('recording.stop', 'Stop Recording');
    await waitFor(
      () => workspace.workspaceRecording?.state === 'temporary',
      'unsaved draft',
    );
    const draft = JSON.stringify(workspace.workspaceRecording);
    await startExport();
    await waitFor(() => exporter.isExporting, 'draft export');
    await waitFor(() => !exporter.isExporting, 'draft export completion');
    if (!exporter.lastExportPath || exporter.errorMessage)
      throw new Error(exporter.errorMessage ?? 'No draft export path');
    paths.push(exporter.lastExportPath);
    if (JSON.stringify(workspace.workspaceRecording) !== draft)
      throw new Error('Draft export changed workspace');
    await invoke('export_verification_report', {
      result: {
        paths,
        savedStateUnchanged: true,
        draftStateUnchanged: true,
        replayUnaffected: true,
        paletteTriggered: true,
      },
    });
  }
} catch (error) {
  await invoke('export_verification_report', {
    result: { verificationFailure: String(error) },
  });
}

import { invoke } from '@tauri-apps/api/core';

import { router } from '../../src/app/router/router';
import {
  EExportFrameRate,
  EExportQuality,
  EExportResolution,
  type TRecordingExportSettings,
} from '../../src/features/recording-export/recording-export.model';

// Opt-in native smoke checks; never loaded by the normal application.
try {
  await router.isReady();
  const mode =
    (window as Window & { cicadaNativeVerificationMode?: string })
      .cicadaNativeVerificationMode ?? '';
  const directory = mode.startsWith('directory:')
    ? mode.slice('directory:'.length)
    : await invoke<string>('default_recording_export_directory');
  const recording = {
    durationMs: 1200,
    events: [
      {
        elapsedMs: 0,
        event: {
          type: 'insert',
          text: 'A long caption keeps exactly the same wrapping and dimensions at every output resolution.',
        },
      },
      { elapsedMs: 350, event: { type: 'commit' } },
      { elapsedMs: 450, event: { type: 'insert', text: 'Second caption' } },
      { elapsedMs: 800, event: { type: 'commit' } },
      { elapsedMs: 900, event: { type: 'insert', text: 'Active caption' } },
    ],
  };
  const layout = {
    position: { x: 0.5, y: 0.65 },
    horizontalAlignment: 'center',
    historyDirection: 'up',
    maxWidth: 500,
  };
  const matrix: Pick<
    TRecordingExportSettings,
    'resolution' | 'fps' | 'quality'
  >[] = [
    {
      resolution: EExportResolution.HD,
      fps: EExportFrameRate.FPS30,
      quality: EExportQuality.Standard,
    },
    {
      resolution: EExportResolution.FullHD,
      fps: EExportFrameRate.FPS60,
      quality: EExportQuality.High,
    },
    {
      resolution: EExportResolution.QHD,
      fps: EExportFrameRate.FPS30,
      quality: EExportQuality.Maximum,
    },
    {
      resolution: EExportResolution.UHD,
      fps: EExportFrameRate.FPS60,
      quality: EExportQuality.High,
    },
  ];
  if (mode.startsWith('directory:')) matrix.splice(1);
  const nonce = Date.now();
  const paths = [];
  for (const selected of matrix) {
    const settings = {
      ...selected,
      directory,
      filename: `verification-${nonce}-${selected.resolution}-${selected.fps}`,
    };
    const output = await invoke<string>('export_recording', {
      recording,
      layout,
      settings,
    });
    paths.push({ output, settings });
  }
  const failures = [];
  for (const override of [
    { fps: 24 },
    { resolution: '8k' },
    { quality: 'invalid' },
    { filename: '../escape' },
    { filename: 'bad/name' },
    { directory: 'relative' },
    {},
  ]) {
    try {
      await invoke('export_recording', {
        recording,
        layout,
        settings: { ...paths[0].settings, ...override },
      });
      throw new Error(
        `Invalid request was accepted: ${JSON.stringify(override)}`,
      );
    } catch (error) {
      if (String(error).includes('Invalid request was accepted')) throw error;
      failures.push({ override, error: String(error) });
    }
  }
  await invoke('export_verification_report', { result: { paths, failures } });
} catch (error) {
  await invoke('export_verification_report', {
    result: { verificationFailure: String(error) },
  });
}

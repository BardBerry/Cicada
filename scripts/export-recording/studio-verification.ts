import { invoke } from '@tauri-apps/api/core';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import {
  createPinia,
  disposePinia,
  getActivePinia,
  setActivePinia,
} from 'pinia';
import { createApp, h, nextTick } from 'vue';

import { COMMAND_DEFINITIONS } from '../../src/app/commands/command-definitions';
import { router } from '../../src/app/router/router';
import { useStudioUiStore } from '../../src/app/use-studio-ui-store';
import CaptionCanvas from '../../src/features/captions/caption-canvas.vue';
import {
  ECaptionHistoryDirection,
  ECaptionHorizontalAlignment,
} from '../../src/features/captions/captions.model';
import { useCaptionLayoutStore } from '../../src/features/captions/use-caption-layout-store';
import {
  EExportResolution,
  ERecordingExportPhase,
} from '../../src/features/recording-export/recording-export.model';
import { useRecordingExportStore } from '../../src/features/recording-export/use-recording-export-store';
import { useRecordingCatalogStore } from '../../src/features/recordings/use-recording-catalog-store';
import { useTypingSessionStore } from '../../src/features/typing/use-typing-session-store';
import { useRecordingWorkspaceStore } from '../../src/features/workspace/use-recording-workspace-store';
import { EStudioView } from '../../src/pages/studio/studio.model';

const results: Record<string, unknown> = {};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function waitFor<T>(
  read: () => T,
  label: string,
): Promise<NonNullable<T>> {
  const deadline = performance.now() + 120000;
  while (performance.now() < deadline) {
    const value = read();
    if (value) return value as NonNullable<T>;
    await sleep(20);
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
  assert(
    row.getAttribute('aria-disabled') !== 'true' &&
      !row.hasAttribute('data-disabled'),
    `Disabled: ${id}`,
  );
  if (id === 'recording.export')
    assert(
      row.querySelector('.label')?.textContent === 'Export Video',
      'Export label changed',
    );
  assert(
    !document.querySelector('[data-command="studio.toggle-view"]'),
    'Internal toggle exposed in palette',
  );
  row.click();
  await waitFor(
    () => !document.querySelector('.command-palette'),
    'palette close',
  );
  await sleep(40);
}
async function disabledCommand(id: string, search: string, reason: string) {
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
  assert(
    (row.getAttribute('aria-disabled') === 'true' ||
      row.hasAttribute('data-disabled')) &&
      row.textContent?.includes(reason),
    `Wrong ${id} availability: ${row.textContent}`,
  );
  key(input, 'Escape');
  await waitFor(
    () => !document.querySelector('.command-palette'),
    'palette close',
  );
}
async function disabledExport(reason: string) {
  await disabledCommand('recording.export', 'Export Video', reason);
  const bottom = [
    ...document.querySelectorAll<HTMLButtonElement>('.studio-controls button'),
  ].find((button) => button.textContent?.trim() === 'Export\u2026');
  assert(
    !bottom || bottom.disabled,
    'Bottom Export ignored availability guard',
  );
}
function toolbarButton(label: string) {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>('.studio-toolbar button'),
  ].find(
    (item) =>
      (item.getAttribute('aria-label') ?? item.textContent?.trim()) === label,
  );
  assert(button, `Missing toolbar button: ${label}`);
  return button;
}
function checkToolbar(view: EStudioView) {
  const workspace = toolbarButton('Workspace');
  const video = toolbarButton('Video Frame');
  assert(
    workspace.getAttribute('aria-pressed') ===
      String(view === EStudioView.Workspace),
    'Workspace selection differs',
  );
  assert(
    video.getAttribute('aria-pressed') ===
      String(view === EStudioView.VideoFrame),
    'Video Frame selection differs',
  );
  const toolbar = document
    .querySelector<HTMLElement>('.studio-toolbar')!
    .getBoundingClientRect();
  const studio = document
    .querySelector<HTMLElement>('.studio')!
    .getBoundingClientRect();
  assert(
    Math.abs(toolbar.x + toolbar.width / 2 - studio.x - studio.width / 2) < 1,
    'Toolbar not centered',
  );
  assert(
    !document.querySelector('.studio-controls .chroma'),
    'Bottom Chroma remains',
  );
  return toolbar;
}
function checkFrameCenter() {
  const studio = document
    .querySelector<HTMLElement>('.studio')!
    .getBoundingClientRect();
  const area = document
    .querySelector<HTMLElement>('.video-frame-canvas')!
    .getBoundingClientRect();
  const frame = document
    .querySelector<HTMLElement>('.frame')!
    .getBoundingClientRect();
  assert(
    Math.abs(area.top - studio.top - 84) < 1 &&
      Math.abs(studio.bottom - area.bottom - 84) < 1,
    'Frame area has asymmetric vertical inset',
  );
  assert(
    Math.abs(area.left - studio.left - (studio.right - area.right)) < 1,
    'Frame area has asymmetric horizontal inset',
  );
  assert(
    Math.abs(frame.x + frame.width / 2 - studio.x - studio.width / 2) < 1 &&
      Math.abs(frame.y + frame.height / 2 - studio.y - studio.height / 2) < 1,
    'Frame not centered in full Studio',
  );
  assert(
    Math.abs(frame.width / frame.height - 1920 / 1080) < 0.001,
    'Frame aspect ratio differs',
  );
  const iframe = document.querySelector<HTMLIFrameElement>('.composition')!;
  assert(
    iframe.offsetWidth === 1920 && iframe.offsetHeight === 1080,
    'Logical frame is not 1920x1080',
  );
}
function metrics(root: HTMLElement) {
  if (root instanceof HTMLIFrameElement) {
    root = root.contentDocument!.body;
  }
  const bounds = root.getBoundingClientRect();
  const scale = bounds.width / 1920;
  return [...root.querySelectorAll<HTMLElement>('.item')].map((item) => {
    const rect = item.getBoundingClientRect();
    return {
      text: item.textContent,
      rect: [
        (rect.x - bounds.x) / scale,
        (rect.y - bounds.y) / scale,
        rect.width / scale,
        rect.height / scale,
      ],
      opacity: Number(getComputedStyle(item).opacity),
    };
  });
}

async function verify() {
  await router.isReady();
  await document.fonts.ready;
  await nextTick();
  const ui = useStudioUiStore();
  const captions = useCaptionLayoutStore();
  const mode = (window as Window & { cicadaNativeVerificationMode?: string })
    .cicadaNativeVerificationMode;
  const positionKey = 'cicada.video-frame-position';
  if (mode === 'seed-invalid-position') {
    localStorage.setItem(positionKey, '{"x":2,"y":0.5}');
    await invoke('export_verification_report', {
      result: {
        mode,
        seededPosition: localStorage.getItem(positionKey),
        nextMode: 'invalid-position',
      },
    });
    return;
  }
  if (mode === 'restart' || mode === 'invalid-position') {
    const expected = mode === 'restart' ? 0.8 : 0.5;
    assert(
      ui.view === EStudioView.Workspace,
      `${mode}: startup view is not Workspace`,
    );
    assert(
      captions.videoFramePosition.x === expected &&
        captions.videoFramePosition.y === expected,
      `${mode}: startup position differs`,
    );
    checkToolbar(EStudioView.Workspace);
    await invoke('export_verification_report', {
      result: {
        mode,
        startupView: ui.view,
        startupPosition: { ...captions.videoFramePosition },
        passed: true,
      },
    });
    return;
  }
  assert(
    !mode || mode === 'normal',
    `Unknown studio verification mode: ${mode}`,
  );
  assert(
    !COMMAND_DEFINITIONS.some(({ id }) => id === 'studio.toggle-view'),
    'Internal view toggle has a palette definition',
  );
  const activePinia = getActivePinia();
  assert(activePinia, 'Missing application Pinia');
  const stored = localStorage.getItem(positionKey);
  const invalidPositions = [
    '{',
    'null',
    '[]',
    '{}',
    '0',
    '{"x":0.2}',
    '{"x":"0.5","y":0.5}',
    '{"x":-0.01,"y":0.5}',
    '{"x":0.5,"y":1.01}',
    '{"x":1e999,"y":0.5}',
  ];
  try {
    for (const value of [null, ...invalidPositions, '{"x":0,"y":1}']) {
      if (value === null) localStorage.removeItem(positionKey);
      else localStorage.setItem(positionKey, value);
      const isolatedPinia = createPinia();
      try {
        const isolated = useCaptionLayoutStore(isolatedPinia);
        const valid = value === '{"x":0,"y":1}';
        assert(
          isolated.videoFramePosition.x === (valid ? 0 : 0.5) &&
            isolated.videoFramePosition.y === (valid ? 1 : 0.5),
          `Stored position validation failed: ${value}`,
        );
      } finally {
        disposePinia(isolatedPinia);
        setActivePinia(activePinia);
      }
    }
  } finally {
    if (stored === null) localStorage.removeItem(positionKey);
    else localStorage.setItem(positionKey, stored);
    setActivePinia(activePinia);
  }
  results.storedPositionValidation = true;
  captions.videoFramePosition = { x: 0.5, y: 0.5 };
  const typing = useTypingSessionStore();
  const input = document.querySelector<HTMLTextAreaElement>('.typing-surface')!;
  input.focus();
  const session = typing.session;
  await disabledExport('No recording loaded');
  assert(
    ![...document.querySelectorAll('.studio-controls button')].some(
      (button) => button.textContent?.trim() === 'Export\u2026',
    ),
    'Export shown without content',
  );
  const initialToolbar = checkToolbar(EStudioView.Workspace);
  for (let i = 0; i < 3; i++) {
    await command('studio.video-frame-view', 'Video Frame Mode');
    assert(
      ui.view === EStudioView.VideoFrame && document.activeElement === input,
      'Video Frame entry lost typing focus',
    );
    checkToolbar(EStudioView.VideoFrame);
    await command('studio.workspace-view', 'Workspace Mode');
    assert(
      useStudioUiStore().view === EStudioView.Workspace &&
        document.activeElement === input,
      'Workspace entry lost typing focus',
    );
    assert(typing.session === session, 'Mode switch replaced session');
  }
  for (const label of ['Workspace', 'Video Frame']) {
    const button = toolbarButton(label);
    button.focus();
    assert(
      document.activeElement === button,
      `${label} toolbar button not keyboard focusable`,
    );
    button.click();
    await nextTick();
    assert(
      document.activeElement === input,
      `${label} toolbar selection lost typing focus`,
    );
    checkToolbar(
      label === 'Workspace' ? EStudioView.Workspace : EStudioView.VideoFrame,
    );
  }
  const selectedToolbar = checkToolbar(EStudioView.VideoFrame);
  assert(
    Math.abs(initialToolbar.x - selectedToolbar.x) < 1 &&
      Math.abs(initialToolbar.width - selectedToolbar.width) < 1,
    'Toolbar shifts between views',
  );
  const chroma = toolbarButton('Chroma');
  assert(
    chroma.getAttribute('aria-disabled') === 'true' &&
      !chroma.disabled &&
      chroma.tabIndex >= 0,
    'Unavailable Chroma is not focusable aria-disabled',
  );
  chroma.focus();
  assert(
    document.activeElement === chroma &&
      chroma.textContent?.trim() === 'Chroma' &&
      !chroma.hasAttribute('aria-describedby') &&
      !document.querySelector('.studio-toolbar [role="tooltip"]'),
    'Chroma label missing or tooltip remains',
  );
  chroma.click();
  ui.enterChromaMode();
  await nextTick();
  assert(
    !ui.isChromaMode && ui.view === EStudioView.VideoFrame,
    'Video Frame accepted Chroma',
  );
  await disabledCommand(
    'studio.enter-chroma',
    'Enter Chroma Mode',
    'Available in Workspace.',
  );
  input.focus();
  key(input, 'h', 'KeyH', true);
  await nextTick();
  assert(
    useStudioUiStore().view === EStudioView.Workspace &&
      document.activeElement === input,
    'Mod+H did not select Workspace',
  );
  key(input, 'h', 'KeyH', true);
  await nextTick();
  assert(
    ui.view === EStudioView.VideoFrame && document.activeElement === input,
    'Mod+H did not select Video Frame',
  );
  results.modeSwitchesAndFocus = true;
  await command('recording.start', 'Start Recording');
  await command('studio.workspace-view', 'Workspace Mode');
  await command('studio.video-frame-view', 'Video Frame Mode');
  assert(
    typing.isRecording && document.activeElement === input,
    'Switch interrupted capture/focus',
  );
  await disabledExport('Finish recording first');

  // Render an unscaled reference with the same props and the original renderer.
  const reference = document.createElement('div');
  reference.style.cssText =
    'position:fixed;left:2200px;top:0;width:1920px;height:1080px;pointer-events:none';
  document.body.append(reference);
  const referenceApp = createApp({
    setup: () => () =>
      h(CaptionCanvas, {
        committedCaptions: typing.session.captions,
        activeText: typing.session.text,
        layout: captions.videoFrameLayout,
        showCaret: true,
        onAnimationUpdate: () => undefined,
      }),
  });
  referenceApp.mount(reference);
  const composition = await waitFor(
    () => document.querySelector<HTMLElement>('.composition'),
    'composition',
  );
  await waitFor(
    () =>
      composition.style.visibility === 'visible' &&
      (composition as HTMLIFrameElement).contentDocument?.querySelector(
        '.caption-canvas',
      ),
    'composition styles and fonts',
  );
  checkFrameCenter();
  let maxGeometryError = 0;
  const samples: unknown[] = [];
  results.motionSamples = samples;
  function compare(label: string) {
    checkFrameCenter();
    const actual = metrics(composition);
    const expected = metrics(reference);
    if (label === 'typed-0') {
      const doc = (composition as HTMLIFrameElement).contentDocument!;
      const item = doc.querySelector<HTMLElement>('.item')!;
      results.iframeAnimationClock = {
        mainTime: document.timeline.currentTime,
        frameTime: doc.timeline.currentTime,
        mainRealm: item instanceof HTMLElement,
        animations: item.getAnimations().map((animation) => ({
          startTime: animation.startTime,
          currentTime: animation.currentTime,
          timing: animation.effect?.getComputedTiming(),
        })),
      };
    }
    assert(actual.length === expected.length, `${label}: item count differs`);
    let error = 0;
    actual.forEach((item, index) => {
      assert(item.text === expected[index].text, `${label}: text differs`);
      if (Math.abs(item.opacity - expected[index].opacity) >= 0.08) {
        results.opacityFailure = {
          label,
          actual,
          expected,
          now: performance.now(),
          visibility: document.visibilityState,
          frame: composition.style.cssText,
        };
      }
      assert(
        Math.abs(item.opacity - expected[index].opacity) < 0.08,
        `${label}: opacity differs`,
      );
      error = Math.max(
        error,
        ...item.rect.map((value, axis) =>
          Math.abs(value - expected[index].rect[axis]),
        ),
      );
    });
    maxGeometryError = Math.max(maxGeometryError, error);
    samples.push({ label, error });
    assert(
      error < 2,
      `${label}: scaled projection differs by ${error} logical px`,
    );
  }
  async function type(text: string) {
    assert(document.activeElement === input, 'Typing not focused');
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
  }
  for (let i = 0; i < 5; i++) {
    await type(
      i % 2 === 0
        ? `Caption ${i}: This long caption wraps across multiple lines in the fixed logical Video Frame while history moves.`
        : `Short caption ${i}`,
    );
    await sleep(350);
    checkFrameCenter();
    compare(`typed-${i}`);
    key(input, 'Enter');
    await nextTick();
    for (const delay of [30, 70, 90, 180]) {
      await sleep(delay);
      compare(`commit-${i}-${delay}`);
    }
  }
  results.motionSamples = samples;
  results.maxGeometryError = maxGeometryError;
  assert(
    (composition as HTMLIFrameElement).contentDocument!.querySelectorAll(
      '.history .item',
    ).length === 3,
    'Exiting history not removed',
  );
  const beforeResize = metrics(composition);
  await getCurrentWindow().setSize(new LogicalSize(1200, 800));
  await sleep(600);
  compare('resized');
  assert(
    metrics(composition).every((item, i) =>
      item.rect.every(
        (value, axis) => Math.abs(value - beforeResize[i].rect[axis]) < 1,
      ),
    ),
    'Resize changed logical geometry',
  );
  for (const width of [720, 1600, 1000]) {
    await getCurrentWindow().setSize(new LogicalSize(width, 700));
    await sleep(350);
    await type('Short before wrapping');
    await sleep(350);
    compare(`width-${width}-short`);
    await type(
      'Wrapping this active caption across several lines must leave the fixed Video Frame geometry unchanged at any application size.',
    );
    await sleep(40);
    compare(`width-${width}-wrap`);
    await type('Deleted across wrap');
    await sleep(40);
    compare(`width-${width}-delete`);
  }
  await type('Resize while committing a caption');
  await sleep(350);
  key(input, 'Enter');
  await nextTick();
  await sleep(30);
  await getCurrentWindow().setSize(new LogicalSize(1100, 740));
  await sleep(80);
  compare('resize-during-commit');
  await sleep(400);
  compare('resize-during-commit-settled');
  for (const alignment of Object.values(ECaptionHorizontalAlignment)) {
    for (const direction of Object.values(ECaptionHistoryDirection)) {
      captions.layout.horizontalAlignment = alignment;
      captions.layout.historyDirection = direction;
      await sleep(350);
      await type(`${alignment} ${direction}`);
      await sleep(350);
      key(input, 'Enter');
      await nextTick();
      await sleep(80);
      compare(`${alignment}-${direction}-commit`);
      await type('Rapid followup');
      key(input, 'Enter');
      await nextTick();
      await sleep(60);
      compare(`${alignment}-${direction}-rapid`);
      await sleep(400);
      compare(`${alignment}-${direction}-settled`);
    }
  }
  captions.layout.horizontalAlignment = ECaptionHorizontalAlignment.Center;
  captions.layout.historyDirection = ECaptionHistoryDirection.Up;
  await sleep(400);
  compare('restored-layout');
  referenceApp.unmount();
  reference.remove();
  results.resizeAndHistoryExit = true;

  const originalWorkspacePosition = JSON.stringify(captions.layout.position);
  const handle = document.querySelector<HTMLButtonElement>('.frame > .anchor')!;
  const frame = document.querySelector<HTMLElement>('.frame')!;
  const capture = handle.setPointerCapture;
  // Synthetic pointer events cannot acquire native capture; exercise the handlers.
  handle.setPointerCapture = () => {};
  const bounds = frame.getBoundingClientRect();
  const positionBeforeDrag = { ...captions.videoFramePosition };
  const sessionBeforeDrag = JSON.stringify(typing.session);
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    }),
  );
  handle.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerId: 1,
      clientX: 100 + bounds.width * 0.1,
      clientY: 100 + bounds.height * 0.1,
      bubbles: true,
    }),
  );
  handle.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: 1, bubbles: true }),
  );
  handle.setPointerCapture = capture;
  await nextTick();
  results.drag = {
    before: positionBeforeDrag,
    after: { ...captions.videoFramePosition },
    frame: [bounds.width, bounds.height],
  };
  assert(
    Math.abs(captions.videoFramePosition.x - positionBeforeDrag.x - 0.1) <
      1.1 / bounds.width,
    'Drag X not normalized to frame',
  );
  assert(
    Math.abs(captions.videoFramePosition.y - positionBeforeDrag.y - 0.1) <
      1.1 / bounds.height,
    'Drag Y not normalized to frame',
  );
  assert(
    JSON.stringify(typing.session) === sessionBeforeDrag &&
      document.activeElement === input,
    'Drag changed typing or lost focus',
  );
  handle.focus();
  key(handle, 'ArrowLeft');
  key(handle, 'ArrowUp');
  key(handle, 'Enter');
  await nextTick();
  assert(
    document.activeElement === input,
    'Keyboard placement did not return typing focus',
  );
  const placement = JSON.stringify(captions.videoFramePosition);
  await command('studio.workspace-view', 'Workspace Mode');
  assert(
    JSON.stringify(captions.layout.position) === originalWorkspacePosition,
    'Video Frame changed Workspace position',
  );
  captions.layout.position = { x: 0.23, y: 0.31 };
  await command('studio.video-frame-view', 'Video Frame Mode');
  assert(
    JSON.stringify(captions.videoFramePosition) === placement,
    'Workspace position change or view switch lost Video Frame placement',
  );
  captions.layout.position = JSON.parse(originalWorkspacePosition);
  await command('studio.workspace-view', 'Workspace Mode');
  const availableChroma = toolbarButton('Chroma');
  availableChroma.focus();
  assert(
    availableChroma.getAttribute('aria-disabled') === 'false' &&
      availableChroma.textContent?.trim() === 'Chroma',
    'Workspace Chroma label or availability differs',
  );
  await command('studio.enter-chroma', 'Enter Chroma Mode');
  assert(
    ui.isChromaMode &&
      useStudioUiStore().view === EStudioView.Workspace &&
      typing.isRecording,
    'Chroma combination/interruption',
  );
  assert(
    !document.querySelector(
      '.studio-toolbar, .studio-controls, .studio-status',
    ) && document.querySelector('.studio--chroma'),
    'Chroma did not hide Studio UI',
  );
  assert(document.activeElement === input, 'Chroma did not focus typing');
  key(input, 'Escape');
  await nextTick();
  assert(
    !ui.isChromaMode &&
      useStudioUiStore().view === EStudioView.Workspace &&
      document.activeElement === input &&
      document.querySelector('.studio-toolbar') &&
      document.querySelector('.studio-controls'),
    'Escape did not exit Chroma first and restore UI/typing focus',
  );
  await command('studio.video-frame-view', 'Video Frame Mode');
  await command('recording.stop', 'Stop Recording');
  const workspace = useRecordingWorkspaceStore();
  assert(
    workspace.workspaceRecording?.state === 'temporary',
    'Capture did not stage draft',
  );
  assert(
    JSON.stringify(captions.videoFramePosition) === placement,
    'Capture completion lost placement',
  );
  results.positioningFocusAndChroma = true;

  await command('recording.discard-draft', 'Discard Draft');
  assert(
    JSON.stringify(captions.videoFramePosition) === placement,
    'Discard reset global placement',
  );
  input.focus();
  await type('Free typing before clear');
  await command('studio.clear-session', 'Clear Session');
  assert(
    JSON.stringify(captions.videoFramePosition) === placement &&
      !typing.session.text &&
      !typing.session.captions.length,
    'Clear reset placement or retained text',
  );
  await command('recording.start', 'Start Recording');
  assert(
    ui.view === EStudioView.VideoFrame &&
      document.activeElement === input &&
      JSON.stringify(captions.videoFramePosition) === placement,
    'Cannot start directly in Video Frame or capture reset placement',
  );
  await type('A short recording authored directly in Studio.');
  await sleep(350);
  key(input, 'Enter');
  await nextTick();
  await type(
    'This final active caption wraps across multiple lines to verify identical export layout at every output resolution.',
  );
  await sleep(400);
  captions.videoFramePosition = { x: 0.63, y: 0.68 };
  await command('recording.stop', 'Stop Recording');
  await sleep(400);
  const sourceId = workspace.workspaceRecording!.id;
  const sourceRecording = JSON.stringify(
    workspace.workspaceRecording!.recording,
  );
  const exporter = useRecordingExportStore();
  const catalog = useRecordingCatalogStore();
  for (let i = 0; i < 2; i++) {
    await command('studio.workspace-view', 'Workspace Mode');
    assert(
      document.activeElement?.classList.contains('studio'),
      'Read-only Workspace focus not restored',
    );
    await command('studio.video-frame-view', 'Video Frame Mode');
    assert(
      document.activeElement?.classList.contains('studio'),
      'Read-only Video Frame focus not restored',
    );
  }
  exporter.preferences.directory =
    '/var/folders/lk/_vvhrqm11g3bcnl6f3tgg8nm0000gn/T/opencode';
  const summaries: {
    layoutMetrics: { viewport: number[]; items: ReturnType<typeof metrics> };
  }[] = [];
  const unlisten = await listen<(typeof summaries)[number]>(
    'recording-export-verification',
    ({ payload }) => summaries.push(payload),
  );
  const paths: string[] = [];
  results.paths = paths;
  async function openSettings(via: 'palette' | 'bottom' = 'palette') {
    if (via === 'palette') await command('recording.export', 'Export Video');
    else {
      const button = [
        ...document.querySelectorAll<HTMLButtonElement>(
          '.studio-controls button',
        ),
      ].find((item) => item.textContent?.trim() === 'Export\u2026');
      assert(button && !button.disabled, 'Bottom Export missing or disabled');
      button.click();
    }
    const dialog = await waitFor(
      () => document.querySelector<HTMLElement>('.recording-export-dialog'),
      'export settings',
    );
    assert(
      ui.view === EStudioView.VideoFrame &&
        !exporter.isExporting &&
        document.querySelectorAll('.recording-export-dialog').length === 1,
      'Single Export invocation did not select Video Frame and open one dialog',
    );
    assert(
      !dialog.hasAttribute('aria-describedby') &&
        !dialog.textContent?.includes('Exports the Video Frame layout.'),
      'Removed dialog description or explanation remains',
    );
    const close = dialog
      .querySelector<HTMLElement>('[aria-label="Close dialog"]')!
      .getBoundingClientRect();
    const title = dialog
      .querySelector<HTMLElement>('.header .title')!
      .getBoundingClientRect();
    assert(
      close.width === 16 &&
        close.height === 16 &&
        Math.abs(close.y + close.height / 2 - title.y - title.height / 2) < 1,
      'Close button size or alignment differs',
    );
    for (const control of dialog.querySelectorAll<HTMLElement>(
      '.ui-input, .ui-select, .export-actions .ui-button, .directory-button',
    )) {
      assert(
        Math.abs(control.getBoundingClientRect().height - 36) < 1,
        'Export control is not compact',
      );
    }
    assert(
      getComputedStyle(dialog.querySelector('.cancel')!).borderTopWidth ===
        '0px',
      'Cancel still has a border',
    );
    return dialog;
  }
  function setFilename(dialog: HTMLElement, filename: string) {
    const field = dialog.querySelector<HTMLInputElement>(
      '[aria-label="File name"]',
    )!;
    field.value = filename;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function submit() {
    document
      .querySelector<HTMLButtonElement>(
        'button[form="recording-export-form"][type="submit"]',
      )!
      .click();
  }
  const baseName = `studio-verification-${Date.now()}`;
  exporter.preferences.filename = `${baseName}-unfinished`;
  for (const view of [EStudioView.Workspace, EStudioView.VideoFrame]) {
    for (const via of ['palette', 'bottom'] as const) {
      await command(
        view === EStudioView.Workspace
          ? 'studio.workspace-view'
          : 'studio.video-frame-view',
        view === EStudioView.Workspace ? 'Workspace Mode' : 'Video Frame Mode',
      );
      const retained = JSON.stringify(exporter.preferences);
      const settings = await openSettings(via);
      assert(
        settings.querySelector<HTMLInputElement>('[aria-label="File name"]')!
          .value === `${baseName}-unfinished`,
        'Reopen lost unfinished filename',
      );
      settings.querySelector<HTMLButtonElement>('.cancel')!.click();
      await waitFor(
        () => !document.querySelector('.recording-export-dialog'),
        'cancel settings',
      );
      assert(
        JSON.stringify(exporter.preferences) === retained,
        'Cancel/reopen changed global settings',
      );
    }
  }
  results.singleInvocationExportsAndRetainedSettings = true;
  await waitFor(
    () =>
      document
        .querySelector<HTMLIFrameElement>('.composition')
        ?.contentDocument?.querySelector('.caption-canvas'),
    'live Video Frame',
  );
  await sleep(400);
  const finalMetrics = metrics(document.querySelector('.composition')!);
  results.previewMetrics = finalMetrics;
  let dialog = await openSettings();
  assert(
    !dialog.querySelector('iframe, .caption-canvas') && !exporter.isExporting,
    'Settings has redundant preview or started export',
  );
  dialog.querySelector<HTMLButtonElement>('.cancel')!.click();
  await sleep(60);
  assert(
    captions.videoFramePosition.x === 0.63 &&
      captions.videoFramePosition.y === 0.68,
    'Cancel lost placement',
  );
  for (const resolution of [
    EExportResolution.HD,
    EExportResolution.FullHD,
    EExportResolution.UHD,
  ]) {
    exporter.preferences.resolution = resolution;
    dialog = await openSettings();
    setFilename(dialog, `${baseName}-${resolution}`);
    await nextTick();
    const submittedFilename = exporter.preferences.filename;
    submit();
    if (resolution === EExportResolution.HD)
      await disabledExport('Export already running');
    if (resolution === EExportResolution.UHD) {
      assert(exporter.isExporting, 'Export not running before navigation');
      await router.push('/settings');
      await nextTick();
      assert(
        document.querySelector('.recording-export-status'),
        'Background export status disappeared',
      );
      if (exporter.isExporting)
        assert(
          document.querySelector('.recording-export-status progress'),
          'Background progress missing',
        );
      await router.push('/');
      assert(
        ui.view === EStudioView.VideoFrame,
        'Export navigation reset view',
      );
      results.backgroundProgressAcrossNavigation = true;
    }
    await waitFor(() => !exporter.isExporting, 'native export complete');
    assert(
      exporter.phase === ERecordingExportPhase.Complete &&
        exporter.lastExportPath,
      exporter.errorMessage ?? 'Export failed',
    );
    paths.push(exporter.lastExportPath);
    assert(
      exporter.preferences.filename !== submittedFilename,
      'Successful export did not regenerate unchanged filename',
    );
    const actual = summaries[summaries.length - 1].layoutMetrics;
    assert(
      actual.viewport[0] === 1920 && actual.viewport[1] === 1080,
      'Native logical viewport changed',
    );
    assert(
      actual.items.length === finalMetrics.length &&
        actual.items.every((item, i) =>
          item.rect.every(
            (value, axis) => Math.abs(value - finalMetrics[i].rect[axis]) < 1,
          ),
        ),
      'Video Frame/native geometry differs',
    );
    if (resolution === EExportResolution.HD) {
      assert(
        workspace.workspaceRecording?.state === 'temporary',
        'Draft export changed saved state',
      );
      await command('recording.save', 'Save Draft');
      await waitFor(
        () => workspace.workspaceRecording?.state === 'saved',
        'save in Video Frame',
      );
      assert(
        workspace.workspaceRecording?.id === sourceId &&
          captions.videoFramePosition.x === 0.63 &&
          captions.videoFramePosition.y === 0.68,
        'Save changed identity/placement',
      );
    }
  }
  results.exportDensitiesMatch = true;
  // Reuse a published name to exercise the normal native failure/retry path.
  dialog = await openSettings();
  setFilename(dialog, `${baseName}-${EExportResolution.UHD}`);
  await nextTick();
  const failedPreferences = JSON.stringify(exporter.preferences);
  submit();
  await waitFor(() => !exporter.isExporting, 'collision');
  assert(
    exporter.phase === ERecordingExportPhase.Failed &&
      exporter.errorMessage?.includes('already exists'),
    'Collision not safely rejected',
  );
  assert(
    JSON.stringify(exporter.preferences) === failedPreferences,
    'Failed export changed unfinished preferences',
  );
  captions.videoFramePosition = { x: 0.61, y: 0.66 };
  dialog = await openSettings();
  assert(
    dialog.querySelector<HTMLInputElement>('[aria-label="File name"]')!
      .value === `${baseName}-${EExportResolution.UHD}`,
    'Failed filename not restored',
  );
  assert(
    captions.videoFramePosition.x === 0.61,
    'Failed placement overwrote newer edits',
  );
  setFilename(dialog, `${baseName}-recovered`);
  await nextTick();
  submit();
  await waitFor(() => !exporter.isExporting, 'recovered export');
  assert(
    exporter.lastExportPath &&
      useRecordingExportStore().phase === ERecordingExportPhase.Complete,
    exporter.errorMessage ?? 'Export recovery failed',
  );
  paths.push(exporter.lastExportPath);
  results.retryRecovery = true;
  await command('recording.new-session', 'New session');
  assert(
    captions.videoFramePosition.x === 0.61 &&
      captions.videoFramePosition.y === 0.66,
    'Close reset global placement',
  );
  await command('recording.open', 'Open Recording');
  const row = await waitFor(
    () => document.querySelector<HTMLElement>(`[data-recording="${sourceId}"]`),
    'saved recording row',
  );
  row.click();
  await waitFor(
    () => workspace.workspaceRecording?.id === sourceId,
    'load recording',
  );
  assert(
    JSON.stringify(workspace.workspaceRecording!.recording) === sourceRecording,
    'Save/load modified recording',
  );
  await command('replay.start', 'Replay Recording');
  await waitFor(
    () => typing.session.text || typing.session.captions.length,
    'replay content',
  );
  assert(
    ui.view === EStudioView.VideoFrame &&
      document.querySelector('.composition') &&
      captions.videoFramePosition.x === 0.61 &&
      captions.videoFramePosition.y === 0.66,
    'Load/replay changed view or global placement',
  );
  const replaySession = typing.session;
  await command('studio.workspace-view', 'Workspace Mode');
  assert(
    typing.isReplaying && document.activeElement?.classList.contains('studio'),
    'Workspace switch interrupted replay/focus',
  );
  await command('studio.video-frame-view', 'Video Frame Mode');
  assert(
    typing.isReplaying &&
      typing.session === replaySession &&
      document.activeElement?.classList.contains('studio'),
    'Video Frame switch interrupted replay/session/focus',
  );
  await sleep(1200);
  assert(!typing.isReplaying, 'Replay did not finish');
  results.savedLoadAndReplay = true;
  const otherId = crypto.randomUUID();
  assert(
    await catalog.saveRecording({
      id: otherId,
      createdAt: new Date().toISOString(),
      name: 'Studio verification with a deliberately long saved recording name '.repeat(
        4,
      ),
      recording: workspace.workspaceRecording!.recording,
    }),
    'Cannot create second isolated fixture',
  );
  captions.videoFramePosition = { x: 0.8, y: 0.8 };
  const retainedPreferences = JSON.stringify(exporter.preferences);
  for (const view of [EStudioView.Workspace, EStudioView.VideoFrame]) {
    await command(
      view === EStudioView.Workspace
        ? 'studio.workspace-view'
        : 'studio.video-frame-view',
      view === EStudioView.Workspace ? 'Workspace Mode' : 'Video Frame Mode',
    );
    await router.push('/settings');
    await router.push('/');
    await nextTick();
    assert(
      ui.view === view &&
        captions.videoFramePosition.x === 0.8 &&
        captions.videoFramePosition.y === 0.8,
      'Navigation reset view or position',
    );
    checkToolbar(view);
    assert(
      JSON.stringify(exporter.preferences) === retainedPreferences,
      'Navigation reset export preferences',
    );
  }
  await command('recording.open', 'Open Recording');
  const otherRow = await waitFor(
    () => document.querySelector<HTMLElement>(`[data-recording="${otherId}"]`),
    'other fixture row',
  );
  otherRow.click();
  await waitFor(
    () => workspace.workspaceRecording?.id === otherId,
    'other source loaded',
  );
  assert(
    captions.videoFramePosition.x === 0.8 &&
      captions.videoFramePosition.y === 0.8,
    'Other recording reset global placement',
  );
  await getCurrentWindow().setSize(new LogicalSize(720, 520));
  await sleep(350);
  checkToolbar(EStudioView.VideoFrame);
  const status = document.querySelector<HTMLElement>('.studio-status')!;
  const statusBounds = status.getBoundingClientRect();
  const statusLabel = status.querySelector<HTMLElement>('.label')!;
  const controlsBounds = document
    .querySelector<HTMLElement>('.studio-controls')!
    .getBoundingClientRect();
  const exportStatusBounds = document
    .querySelector<HTMLElement>('.recording-export-status')!
    .getBoundingClientRect();
  const brandBounds = document
    .querySelector<HTMLElement>('.brand')!
    .getBoundingClientRect();
  const navigationBounds = document
    .querySelector<HTMLElement>('.app-navigation')!
    .getBoundingClientRect();
  const studioBounds = document
    .querySelector<HTMLElement>('.studio')!
    .getBoundingClientRect();
  assert(
    Math.abs(exportStatusBounds.bottom - controlsBounds.bottom) < 1,
    'Export status bottom inset differs from bottom controls',
  );
  assert(
    Math.abs(
      studioBounds.right -
        exportStatusBounds.right -
        (navigationBounds.left - studioBounds.left),
    ) < 1,
    'Export status right inset differs from navigation left inset',
  );
  assert(
    Math.abs(
      statusBounds.y +
        statusBounds.height / 2 -
        brandBounds.y -
        brandBounds.height / 2,
    ) < 1,
    'Studio status is not aligned with the logo',
  );
  assert(
    statusLabel.scrollWidth > statusLabel.clientWidth &&
      statusLabel.title.includes('deliberately long'),
    'Long status is not safely truncated',
  );
  results.exportStatusInsetsMatchPanels = true;
  const otherSettings = await openSettings('bottom');
  assert(
    JSON.stringify(exporter.preferences) === retainedPreferences,
    'Other recording replaced unfinished global export settings',
  );
  otherSettings.querySelector<HTMLButtonElement>('.cancel')!.click();
  await waitFor(
    () => !document.querySelector('.recording-export-dialog'),
    'other source cancel',
  );
  results.globalPositionAcrossSourcesAndNavigation = true;
  await revealItemInDir(paths[0]);
  results.nativeFinderReveal = true;
  unlisten();
  // Delete only the fixture created by this verification run.
  await command('recording.new-session', 'New session');
  await catalog.deleteRecording(sourceId);
  await catalog.deleteRecording(otherId);
  assert(
    captions.videoFramePosition.x === 0.8 &&
      captions.videoFramePosition.y === 0.8,
    'Fixture cleanup reset position',
  );
  ui.selectView(EStudioView.VideoFrame);
  assert(
    localStorage.getItem(positionKey) === JSON.stringify({ x: 0.8, y: 0.8 }),
    'Final restart position not persisted',
  );
  results.restartFixture = {
    view: ui.view,
    position: { ...captions.videoFramePosition },
  };
  results.maxGeometryError = maxGeometryError;
  await invoke('export_verification_report', { result: results });
}

try {
  await verify();
} catch (error) {
  await invoke('export_verification_report', {
    result: { ...results, verificationFailure: String(error) },
  });
}
